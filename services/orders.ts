// @ts-nocheck
import { errorLog, debugLog } from '@/utils/logger';
import { uuid } from '../utils/uuid';
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
import { checkoutTokenIntegrity } from '@/services/monitoring';
import SettingsAgent from '@/agents/settings-agent';
import { loadKycReceipt } from '@/services/kycReceipts';
import { getPublicKeyHex } from '@/services/localIdentity';
import { verifyMessageSignature } from '@/utils/verifyMessageSignature';

const ORDER_TOPIC = '/blue-ocean/orders/1';
const NOTIFICATION_TOPIC = '/blue-ocean/notifications/1';
const PRODUCT_TOPIC = '/blue-ocean/products/1';
const LOW_STOCK_THRESHOLD = 5;
const KYC_RECEIPT_ERROR = 'KYC receipt missing or invalid';

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
  sessionToken?: string,
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
  try {
    const createdPayload = { ...baseEvent };
    await eventBus.publish(ORDER_TOPIC, 'order.created', createdPayload);
    await eventBus.publish(NOTIFICATION_TOPIC, 'order.created', createdPayload);
    if (order.paymentMethod === 'near') {
      const escrowPayload = { ...baseEvent };
      await eventBus.publish(ORDER_TOPIC, 'escrow.deployed', escrowPayload);
      await eventBus.publish(NOTIFICATION_TOPIC, 'escrow.deployed', escrowPayload);

    }
  } catch (err) {
    errorLog('Failed to emit order events', err);
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
  }

  public removeListener(listener: () => void) {
    this.listeners.delete(listener);
  }

  private reserveCheckoutNonce(sessionToken: string, nonce: string): void {
    if (typeof nonce !== 'string' || nonce.length === 0) {
      throw new Error('ERR_DUPLICATE_NONCE');
    }
    const active = this.checkoutNonceLocks.get(sessionToken);
    if (active) {
      void eventBus.track('checkout.duplicate_attempt', {
        nonce,
        activeNonce: active,
        source: 'lock',
      });
      throw new Error('ERR_DUPLICATE_NONCE');
    }
    const session = getSession(sessionToken);
    if (session?.checkoutNonce && session.checkoutNonce !== nonce) {
      void eventBus.track('checkout.duplicate_attempt', {
        nonce,
        activeNonce: session.checkoutNonce,
        source: 'session',
      });
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
    debugLog('Deploying escrow', {
      nonce: draft.nonce,
      storeId: draft.storeId,
      total: draft.total,
      itemsHash: draft.itemsHash,
    });
    return deployOrderPayment(draft.total);
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
        allSteps[i].timestamp = new Date(now.getTime() - minutesAgo * 60000).toISOString();
      }
    }
    return allSteps;
  }

  private async verifyKycReceipt(sessionToken: string): Promise<VerifiedKycReceipt> {
    const fail = (reason: string): never => {
      errorLog('KYC receipt validation failed', { reason });
      throw new Error(KYC_RECEIPT_ERROR);
    };

    const session = getSession(sessionToken);
    if (!session || typeof session.deviceHash !== 'string' || session.deviceHash.length === 0) {
      return fail('session_missing');
    }

    const buyerPublicKey = await getPublicKeyHex();
    if (!buyerPublicKey) {
      return fail('buyer_key_missing');
    }

    const receipt = await loadKycReceipt(buyerPublicKey);
    if (!receipt) {
      return fail('receipt_missing');
    }

    if (!receipt.payload || receipt.payload.buyerPublicKey !== buyerPublicKey) {
      return fail('buyer_key_mismatch');
    }

    if (!receipt.signature || typeof receipt.signature !== 'string') {
      return fail('signature_missing');
    }

    const issuerPublicKey = receipt.payload.issuerPublicKey;
    const senderPublicKey = receipt.sender?.publicKey;

    if (typeof senderPublicKey !== 'string' || senderPublicKey.length === 0) {
      return fail('issuer_missing');
    }

    if (issuerPublicKey !== senderPublicKey) {
      return fail('issuer_mismatch');
    }

    const signatureValid = await verifyMessageSignature(receipt, senderPublicKey);
    if (!signatureValid) {
      return fail('signature_invalid');
    }

    const data = receipt.payload.data || {};
    let receiptDeviceHash: string | undefined;
    if (data && typeof data === 'object') {
      receiptDeviceHash =
        data.deviceHash || data.device_hash || data['device-hash'] || data.device_hash_hex;
    }

    if (typeof receiptDeviceHash !== 'string') {
      return fail('device_hash_missing');
    }

    if (receiptDeviceHash !== session.deviceHash) {
      return fail('device_hash_mismatch');
    }

    const receiptHash = Buffer.from(
      sha256(
        Buffer.from(
          canonicalJson({
            type: receipt.type,
            payload: receipt.payload,
            sender: receipt.sender,
            signature: receipt.signature,
          }),
        ),
      ),
    ).toString('hex');

    const sealedHash = session.sealed?.kycReceiptHash;
    if (typeof sealedHash === 'string' && sealedHash !== receiptHash) {
      return fail('receipt_hash_mismatch');
    }

    return {
      receiptId: receipt.payload.receiptId,
      buyerPublicKey,
      signature: receipt.signature,
      hash: receiptHash,
    };
  }

  async createOrder(
    userId: string,
    items: CartItem[],
    shippingAddress: ShippingAddress,
    payment?: {
      method?: 'cash_on_delivery' | 'near' | 'card';
      contractAddress?: string;
      txHash?: string;
      buyerAddress?: string;
      sellerAddress?: string;
    },
    sessionToken: string,
    nonce: string,
    storeId: string,
    verifiedKyc?: VerifiedKycReceipt,
  ): Promise<Order> {
    assertCheckoutScope(sessionToken);
    const kyc = verifiedKyc ?? (await this.verifyKycReceipt(sessionToken));
    const total = items.reduce((sum, item) => {
      const price = item.unitPrice ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const itemsHash = Buffer.from(
      sha256(Buffer.from(canonicalJson(items)))
    ).toString('hex');

    const orderId = uuid();
    const timestamp = new Date().toISOString();

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
      try {
        const { contractAddress, txHash } = await this.deployEscrow(draft);
        void eventBus.track('escrow.success', {
          orderId,
          nonce: draft.nonce,
          contractAddress,
          txHash,
        });
        pay = { ...pay, contractAddress, txHash };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        void eventBus.track('escrow.failure', {
          orderId,
          nonce: draft.nonce,
          message,
        });
        throw err;
      }
    }

    if (!pay?.buyerAddress) {
      pay = { ...pay, buyerAddress: chainAdapter.getAccountId() || undefined };
    }

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
    try {
      assertCheckoutScope(sessionToken);
    } catch (err) {
      void eventBus.track('checkout.token_integrity', {
        tokenValid: false,
        success: false,
      });
      checkoutTokenIntegrity.inc({ token_valid: 'false', success: 'false' });
      throw err;
    }
    this.reserveCheckoutNonce(sessionToken, nonce);
    try {
      const verifiedKyc = await this.verifyKycReceipt(sessionToken);
      const grouped: Record<string, CartItem[]> = {};
      for (const item of cartItems) {
        const storeId = item.product.storeId;
        if (!grouped[storeId]) grouped[storeId] = [];
        grouped[storeId].push(item);
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
        await emitOrderEvents(order, storeId, sessionToken);
        orders.push(order);
      }
      void eventBus.track('checkout.token_integrity', {
        tokenValid: true,
        success: true,
      });
      checkoutTokenIntegrity.inc({ token_valid: 'true', success: 'true' });
      return orders;
    } catch (err) {
      void eventBus.track('checkout.token_integrity', {
        tokenValid: true,
        success: false,
      });
      checkoutTokenIntegrity.inc({ token_valid: 'true', success: 'false' });
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
