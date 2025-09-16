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
import { checkoutTokenIntegrity } from '@/services/monitoring';
import SettingsAgent from '@/agents/settings-agent';
import {
  assertCheckoutSession,
  type CheckoutSessionContext,
} from '@/services/checkoutGuard';

const ORDER_TOPIC = '/blue-ocean/orders/1';
const PRODUCT_TOPIC = '/blue-ocean/products/1';
const LOW_STOCK_THRESHOLD = 5;

export async function emitOrderEvents(
  order: Order,
  storeId: string,
  sessionToken?: string,
) {
  const baseEvent = {
    id: order.id,
    orderId: order.id,
    storeId,
    buyerAddress: order.buyerAddress,
    sellerAddress: order.sellerAddress,
    sessionToken,
    payment: {
      method: order.paymentMethod,
      contractAddress: order.paymentContractAddress,
      txHash: order.paymentTxHash,
      total: order.total,
    },
  };
  try {
    await eventBus.publish(ORDER_TOPIC, 'order.created', {
      ...baseEvent,
    });
    if (order.paymentMethod === 'near') {
      await eventBus.publish(ORDER_TOPIC, 'escrow.deployed', {
        ...baseEvent,
      });

    }
  } catch (err) {
    errorLog('Failed to emit order events', err);
  }
}

class OrderService {
  private static instance: OrderService;
  private listeners: Set<() => void> = new Set();

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
    checkout?: CheckoutSessionContext,
  ): Promise<Order> {
    const guard =
      checkout && checkout.token === sessionToken
        ? checkout
        : await assertCheckoutSession(userId, sessionToken, {
            user: checkout?.user,
          });
    const buyerHint = guard.user.address || guard.user.id;
    const total = items.reduce((sum, item) => {
      const price = item.unitPrice ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);

    let pay = payment;
    if (pay?.method === 'near' && (!pay.contractAddress || !pay.txHash)) {
      if (!chainAdapter.getAccountId()) {
        await chainAdapter.openModal();
      }
      const { contractAddress, txHash } = await deployOrderPayment(total);
      pay = { ...pay, contractAddress, txHash };
    }

    if (!pay?.buyerAddress) {
      const account = chainAdapter.getAccountId();
      pay = {
        ...pay,
        buyerAddress: account || buyerHint || undefined,
      };
    }

    const orderId = uuid();
    const timestamp = new Date().toISOString();
    const itemsHash = Buffer.from(
      sha256(Buffer.from(canonicalJson(items)))
    ).toString('hex');
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
  ): Promise<Order[]> {
    let checkoutGuard: CheckoutSessionContext;
    try {
      checkoutGuard = await assertCheckoutSession(userId, sessionToken);
    } catch (err) {
      checkoutTokenIntegrity.inc({ token_valid: 'false', success: 'false' });
      throw err;
    }
    try {
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
                buyerAddress:
                  chainAdapter.getAccountId() ||
                  checkoutGuard.user.address ||
                  checkoutGuard.user.id ||
                  undefined,
                sellerAddress: store?.owner,
              }
            : paymentMethod === 'card'
            ? {
                method: 'card' as const,
                buyerAddress:
                  chainAdapter.getAccountId() ||
                  checkoutGuard.user.address ||
                  checkoutGuard.user.id ||
                  undefined,
                sellerAddress: store?.owner,
              }
            : {
                method: 'cash_on_delivery' as const,
                buyerAddress:
                  chainAdapter.getAccountId() ||
                  checkoutGuard.user.address ||
                  checkoutGuard.user.id ||
                  undefined,
                sellerAddress: store?.owner,
              };
        const order = await this.createOrder(
          userId,
          items,
          shippingAddress,
          payment,
          sessionToken,
          checkoutGuard,
        );
        await emitOrderEvents(order, storeId, sessionToken);
        orders.push(order);
      }
      checkoutTokenIntegrity.inc({ token_valid: 'true', success: 'true' });
      return orders;
    } catch (err) {
      checkoutTokenIntegrity.inc({ token_valid: 'true', success: 'false' });
      throw err;
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
