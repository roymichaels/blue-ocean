// @ts-nocheck
import { errorLog, debugLog } from '@/utils/logger';
import ordersAgent from '../agents/orders-agent';
import eventBus from './eventBus';
import {
  Order,
  OrderStatus,
  CartItem,
  ShippingAddress,
  OrderTrackingStep,
} from '../types';
import { sha256 } from '@noble/hashes/sha256';
import { getStore } from '@/features/stores/services/nearStores';
import { getProduct, setProduct } from '@/features/products/services/nearProducts';
import { chainAdapter } from '@/services/chain';
import { adminResolve, deployOrderPayment } from './nearContract';
import { canonicalJson } from '@/utils/serialization';
import { calculateCardFees } from '@/features/payments/services/card';
import {
  assertCheckoutScope,
  getSession,
  setSessionCheckoutNonce,
} from '@/services/session';
import { checkoutTokenIntegrity, latencyHistogram } from '@/services/monitoring';
import SettingsAgent from '@/agents/settings-agent';
import { loadKycReceipt } from '@/services/kycReceipts';
import { getPublicKeyHex } from '@/services/localIdentity';
import { verifyMessageSignature } from '@/utils/verifyMessageSignature';

const ORDER_TOPIC = '/blue-ocean/orders/1';
const NOTIFICATION_TOPIC = '/blue-ocean/notifications/1';
const PRODUCT_TOPIC = '/blue-ocean/products/1';
const LOW_STOCK_THRESHOLD = 5;
const KYC_RECEIPT_ERROR = 'KYC receipt missing or invalid';
const ORDER_PIPELINE_SERVICE = 'orders.pipeline';

function deriveOrderId(nonce: string, storeId: string): string {
  const digest = Buffer.from(
    sha256(Buffer.from(canonicalJson({ nonce, storeId }))),
  ).toString('hex');
  return digest.slice(0, 64);
}

function recordOrderStageDuration(
  orderId: string,
  orderNonce: string,
  stage: string,
  durationMs: number,
): void {
  latencyHistogram.observe(
    {
      service: ORDER_PIPELINE_SERVICE,
      stage,
      order_id: orderId,
      order_nonce: orderNonce,
    },
    durationMs,
  );
}

function recordStageForOrders(
  orderIds: Iterable<string>,
  orderNonce: string,
  stage: string,
  durationMs: number,
): void {
  for (const orderId of orderIds) {
    recordOrderStageDuration(orderId, orderNonce, stage, durationMs);
  }
}

type VerifiedKycReceipt = {
  receiptId: string;
  buyerPublicKey: string;
  signature: string;
  hash: string;
};

interface OrderDraft {
  sessionToken: string;
  nonce: string;
  storeId: string;
  total: number;
  itemsHash: string;
  buyerAddress?: string;
  sellerAddress?: string;
}

export async function emitOrderEvents(
  order: Order,
  storeId: string,
  sessionToken: string | undefined,
  orderNonce: string,
) {
  const parseDeterministicTimestamp = (): number => {
    const candidates = [order.createdAt, order.updatedAt];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const parsed = Date.parse(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    const digest = Buffer.from(
      sha256(Buffer.from(canonicalJson({ orderId: order.id }))),
    ).toString('hex');
    return Number.parseInt(digest.slice(0, 13), 16);
  };

  const deterministicTimestamp = parseDeterministicTimestamp();

  const baseEvent = {
    id: order.id,
    orderId: order.id,
    orderNonce,
    timestamp: deterministicTimestamp,
    storeId,
    buyerAddress: order.buyerAddress,
    sellerAddress: order.sellerAddress,
    sessionToken,
    kycReceiptId: order.kycReceiptId,
    payment: {
      method: order.paymentMethod,
      contractAddress: order.paymentContractAddress,
      txHash: order.paymentTxHash,
      total: order.total,
    },
  };
  const publishWithContext = async (
    contentTopic: string,
    type: string,
    payload: Record<string, unknown>,
  ) => {
    await eventBus.publish(contentTopic, type, payload, {
      orderId: order.id,
      orderNonce,
      stage: type,
    });
  };
  try {
    debugLog('orders.events.publish.start', {
      orderId: order.id,
      orderNonce,
      storeId,
    });
    const createdPayload = { ...baseEvent };
    await publishWithContext(ORDER_TOPIC, 'order.created', createdPayload);
    await publishWithContext(NOTIFICATION_TOPIC, 'order.created', createdPayload);
    if (order.paymentMethod === 'near') {
      const escrowPayload = { ...baseEvent };
      await publishWithContext(ORDER_TOPIC, 'escrow.deployed', escrowPayload);
      await publishWithContext(
        NOTIFICATION_TOPIC,
        'escrow.deployed',
        escrowPayload,
      );
    }
    debugLog('orders.events.publish.success', {
      orderId: order.id,
      orderNonce,
      storeId,
    });
  } catch (err) {
    errorLog('Failed to emit order events', {
      orderId: order.id,
      orderNonce,
      storeId,
      errorMessage: err instanceof Error ? err.message : err,
      errorStack: err instanceof Error ? err.stack : undefined,
    });
  }
}

class OrderService {
  private static instance: OrderService;
  private listeners: Set<() => void> = new Set();
  private checkoutNonceLocks: Map<string, string> = new Map();

  private constructor() {
    ordersAgent.subscribe(() => this.notifyListeners());
  }

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  public addListener(listener: () => void) {
    this.listeners.add(listener);
@@ -137,57 +204,86 @@ class OrderService {
      throw new Error('ERR_DUPLICATE_NONCE');
    }
    const active = this.checkoutNonceLocks.get(sessionToken);
    if (active) {
      throw new Error('ERR_DUPLICATE_NONCE');
    }
    const session = getSession(sessionToken);
    if (session?.checkoutNonce && session.checkoutNonce !== nonce) {
      throw new Error('ERR_DUPLICATE_NONCE');
    }
    this.checkoutNonceLocks.set(sessionToken, nonce);
    setSessionCheckoutNonce(sessionToken, nonce);
  }

  private releaseCheckoutNonce(sessionToken: string, nonce: string): void {
    const active = this.checkoutNonceLocks.get(sessionToken);
    if (active === nonce) {
      this.checkoutNonceLocks.delete(sessionToken);
      setSessionCheckoutNonce(sessionToken, null);
    }
  }

  private async deployEscrow(
    draft: OrderDraft,
  ): Promise<{ contractAddress: string; txHash: string }> {
    const orderId = deriveOrderId(draft.nonce, draft.storeId);
    const timer = latencyHistogram.startTimer({
      service: ORDER_PIPELINE_SERVICE,
      stage: 'escrow_deploy',
      order_id: orderId,
      order_nonce: draft.nonce,
    });
    debugLog('orders.escrow.deploy.start', {
      orderId,
      orderNonce: draft.nonce,
      storeId: draft.storeId,
      total: draft.total,
      itemsHash: draft.itemsHash,
    });
    try {
      const result = await deployOrderPayment(draft.total);
      debugLog('orders.escrow.deploy.success', {
        orderId,
        orderNonce: draft.nonce,
        storeId: draft.storeId,
        contractAddress: result.contractAddress,
        txHash: result.txHash,
      });
      return result;
    } catch (err) {
      errorLog('orders.escrow.deploy.failed', {
        orderId,
        orderNonce: draft.nonce,
        storeId: draft.storeId,
        errorMessage: err instanceof Error ? err.message : err,
        errorStack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    } finally {
      timer();
    }
  }

  private getTrackingSteps(status: OrderStatus): OrderTrackingStep[] {
    const allSteps: OrderTrackingStep[] = [
      { status: 'order_received', title: 'הזמנה התקבלה', timestamp: new Date().toISOString(), completed: false },
      { status: 'courier_found', title: 'נמצא שליח מתאים', timestamp: '', completed: false },
      { status: 'courier_picked_up', title: 'שליח אסף את ההזמנה', timestamp: '', completed: false },
      { status: 'courier_on_way', title: 'שליח בדרך אלייך', timestamp: '', completed: false },
      { status: 'delivered', title: 'הזמנה התקבלה (השאר ביקורת)', timestamp: '', completed: false },
    ];

    const statusOrder: OrderStatus[] = [
      'order_received',
      'courier_found',
      'courier_picked_up',
      'courier_on_way',
      'delivered',
    ];

    const currentIndex = statusOrder.indexOf(status);
    for (let i = 0; i <= currentIndex; i++) {
      allSteps[i].completed = true;
      if (!allSteps[i].timestamp) {
        const now = new Date();
        const minutesAgo = (currentIndex - i) * 10;
@@ -310,160 +406,231 @@ class OrderService {
      sha256(Buffer.from(canonicalJson(items)))
    ).toString('hex');

    let pay = payment;
    if (pay?.method === 'near' && (!pay.contractAddress || !pay.txHash)) {
      if (!chainAdapter.getAccountId()) {
        await chainAdapter.openModal();
      }
      const draft: OrderDraft = {
        sessionToken,
        nonce,
        storeId,
        total,
        itemsHash,
        buyerAddress: pay?.buyerAddress,
        sellerAddress: pay?.sellerAddress,
      };
      const { contractAddress, txHash } = await this.deployEscrow(draft);
      pay = { ...pay, contractAddress, txHash };
    }

    if (!pay?.buyerAddress) {
      pay = { ...pay, buyerAddress: chainAdapter.getAccountId() || undefined };
    }

    const orderId = deriveOrderId(nonce, storeId);
    debugLog('orders.createOrder.start', {
      orderId,
      orderNonce: nonce,
      storeId,
      userId,
    });
    const timestamp = new Date().toISOString();
    const feeInfo =
      pay?.method === 'card' ? await calculateCardFees(total) : undefined;

    const order: Order = {
      id: orderId,
      userId,
      items,
      total,
      status: 'order_received',
      shippingAddress,
      itemsHash,
      paymentMethod: pay?.method ?? 'cash_on_delivery',
      buyerAddress: pay?.buyerAddress,
      sellerAddress: pay?.sellerAddress,
      sessionToken,
      paymentContractAddress: pay?.contractAddress,
      escrowAddr: pay?.contractAddress,
      paymentTxHash: pay?.txHash,
      createdAt: timestamp,
      updatedAt: timestamp,
      trackingSteps: this.getTrackingSteps('order_received'),
      platformFee: feeInfo?.platformFee,
      sellerPayout: feeInfo?.sellerPayout,
      kycReceiptId: kyc.receiptId,
      kycReceiptHash: kyc.hash,
      kycReceiptSignature: kyc.signature,
    };

    await ordersAgent.add(order);
    debugLog('orders.createOrder.persisted', {
      orderId,
      orderNonce: nonce,
      storeId,
      total,
    });
    await this.decrementProductStock(items);
    this.notifyListeners();
    return order;
  }

  async createOrdersFromCart(
    userId: string,
    cartItems: CartItem[],
    shippingAddress: ShippingAddress,
    paymentMethod: 'cash_on_delivery' | 'near' | 'card' = 'cash_on_delivery',
    sessionToken: string,
    nonce: string,
  ): Promise<Order[]> {
    const grouped: Record<string, CartItem[]> = {};
    for (const item of cartItems) {
      const storeId = item.product.storeId;
      if (!grouped[storeId]) grouped[storeId] = [];
      grouped[storeId].push(item);
    }
    const orderIds = new Map<string, string>();
    for (const storeId of Object.keys(grouped)) {
      orderIds.set(storeId, deriveOrderId(nonce, storeId));
    }
    const knownOrderIds = Array.from(orderIds.values());

    const scopeStarted = Date.now();
    try {
      assertCheckoutScope(sessionToken);
      const duration = Date.now() - scopeStarted;
      recordStageForOrders(orderIds.values(), nonce, 'scope_request', duration);
      debugLog('orders.scope_request.success', {
        orderNonce: nonce,
        durationMs: duration,
        orderIds: knownOrderIds,
      });
    } catch (err) {
      const duration = Date.now() - scopeStarted;
      recordStageForOrders(orderIds.values(), nonce, 'scope_request', duration);
      errorLog('orders.scope_request.failed', {
        orderNonce: nonce,
        durationMs: duration,
        orderIds: knownOrderIds,
        errorMessage: err instanceof Error ? err.message : err,
        errorStack: err instanceof Error ? err.stack : undefined,
      });
      void eventBus.track('checkout.token_integrity', {
        tokenValid: false,
        success: false,
        orderNonce: nonce,
      });
      checkoutTokenIntegrity.inc({ token_valid: 'false', success: 'false' });
      throw err;
    }
    this.reserveCheckoutNonce(sessionToken, nonce);
    try {
      let verifiedKyc: VerifiedKycReceipt;
      const kycStarted = Date.now();
      try {
        verifiedKyc = await this.verifyKycReceipt(sessionToken);
        const duration = Date.now() - kycStarted;
        recordStageForOrders(orderIds.values(), nonce, 'kyc_check', duration);
        debugLog('orders.kyc_check.success', {
          orderNonce: nonce,
          durationMs: duration,
          orderIds: knownOrderIds,
          receiptId: verifiedKyc.receiptId,
        });
      } catch (err) {
        const duration = Date.now() - kycStarted;
        recordStageForOrders(orderIds.values(), nonce, 'kyc_check', duration);
        errorLog('orders.kyc_check.failed', {
          orderNonce: nonce,
          durationMs: duration,
          orderIds: knownOrderIds,
          errorMessage: err instanceof Error ? err.message : err,
          errorStack: err instanceof Error ? err.stack : undefined,
        });
        throw err;
      }

      const orders: Order[] = [];
      for (const [storeId, items] of Object.entries(grouped)) {
        const store = await getStore(storeId, storeId);
        const payment =
          paymentMethod === 'near'
            ? {
                method: 'near' as const,
                buyerAddress: chainAdapter.getAccountId() || undefined,
                sellerAddress: store?.owner,
              }
            : paymentMethod === 'card'
            ? {
                method: 'card' as const,
                buyerAddress: chainAdapter.getAccountId() || undefined,
                sellerAddress: store?.owner,
              }
            : {
                method: 'cash_on_delivery' as const,
                buyerAddress: chainAdapter.getAccountId() || undefined,
                sellerAddress: store?.owner,
              };
        const order = await this.createOrder(
          userId,
          items,
          shippingAddress,
          payment,
          sessionToken,
          nonce,
          storeId,
          verifiedKyc,
        );
        await emitOrderEvents(order, storeId, sessionToken, nonce);
        orders.push(order);
      }
      void eventBus.track('checkout.token_integrity', {
        tokenValid: true,
        success: true,
        orderNonce: nonce,
      });
      checkoutTokenIntegrity.inc({ token_valid: 'true', success: 'true' });
      debugLog('orders.checkout.complete', {
        orderNonce: nonce,
        orderIds: knownOrderIds,
      });
      return orders;
    } catch (err) {
      void eventBus.track('checkout.token_integrity', {
        tokenValid: true,
        success: false,
        orderNonce: nonce,
      });
      checkoutTokenIntegrity.inc({ token_valid: 'true', success: 'false' });
      errorLog('orders.checkout.failed', {
        orderNonce: nonce,
        orderIds: knownOrderIds,
        errorMessage: err instanceof Error ? err.message : err,
        errorStack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    } finally {
      this.releaseCheckoutNonce(sessionToken, nonce);
    }
  }

  private async decrementProductStock(items: CartItem[]): Promise<void> {
    for (const item of items) {
      try {
        const product = await getProduct(item.product.storeId, item.productId);
        if (!product) {
          errorLog('Product not found when decrementing stock', item.productId);
          continue;
        }
        if (product.stock < item.quantity) {
          errorLog('Insufficient stock for product', {
            productId: item.productId,
            requested: item.quantity,
            available: product.stock,
          });
          continue;
        }
        product.stock -= item.quantity;
        await setProduct(product.storeId, product);
        if (product.stock <= LOW_STOCK_THRESHOLD) {
          debugLog('Low stock warning', {
            productId: product.id,
            stock: product.stock,
          });
          await eventBus.publish(PRODUCT_TOPIC, 'product.low_stock', {
            productId: product.id,
            stock: product.stock,
          });
        }
      } catch (err) {
        errorLog('Failed to update product stock', err);
      }
    }
  }

  private simulateOrderProgress(orderId: string) {
    const statusProgression: OrderStatus[] = [
      'courier_found',
      'courier_picked_up',
      'courier_on_way',
      'delivered',
    ];
    const delays = [30000, 60000, 120000, 180000];
    for (let i = 0; i < statusProgression.length; i++) {
      setTimeout(async () => {
        await this.updateOrderStatus(orderId, statusProgression[i]);
      }, delays[i]);
    }
  }
  async getOrder(id: string): Promise<Order | null> {
    return ordersAgent.get(id) || null;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    const all = await ordersAgent.getAll();
    return all.filter((o) => o.userId === userId);
  }

  async getUserOrderCount(userId: string): Promise<number> {
    return (await this.getUserOrders(userId)).length;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = await ordersAgent.get(orderId);
    if (!order) return;
    order.status = status;
    order.trackingSteps = this.getTrackingSteps(status);
    order.updatedAt = new Date().toISOString();
    await ordersAgent.update(order);
    this.notifyListeners();
  }

  async resolveDispute(orderId: string, toSeller: boolean): Promise<void> {
    const order = await ordersAgent.get(orderId);
    if (!order || !order.escrowAddr) return;
    const actor = chainAdapter.getAccountId();
    if (!actor) {
      throw new Error('Admin wallet address required');
    }
    const hasScope = await SettingsAgent.getInstance().hasAdminScope(
      actor,
      'admin:orders',
    );
    if (!hasScope) {
      throw new Error('Admin wallet address required');
    }
    await adminResolve(order.escrowAddr, toSeller);
    await this.updateOrderStatus(orderId, toSeller ? 'released' : 'refunded');
  }
}

export default OrderService;
