// @ts-nocheck
import { errorLog, debugLog } from '@/utils/logger';
import { randomUUID } from 'crypto';
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
import { getStore } from './tonStores';
import { getProduct, setProduct } from './tonProducts';
import nearAuth from './nearAuth';
import { adminResolve, deployOrderPayment } from './tonContract';
import config from '../utils/appConfig';
import { calculateCardFees } from '@/payments/card';

const ORDER_TOPIC = '/blue-ocean/orders/1';
const PRODUCT_TOPIC = '/blue-ocean/products/1';
const LOW_STOCK_THRESHOLD = 5;

export async function emitOrderEvents(order: Order, storeId: string) {
  const baseEvent = {
    id: order.id,
    orderId: order.id,
    storeId,
    buyerAddress: order.buyerAddress,
    sellerAddress: order.sellerAddress,
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
    if (order.paymentMethod === 'ton') {
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
      method?: 'cash_on_delivery' | 'ton' | 'card';
      contractAddress?: string;
      txHash?: string;
      buyerAddress?: string;
      sellerAddress?: string;
    },
  ): Promise<Order> {
    const total = items.reduce((sum, item) => {
      const price = item.unitPrice ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);

    let pay = payment;
    if (pay?.method === 'ton' && (!pay.contractAddress || !pay.txHash)) {
      if (!nearAuth.getAccountId()) {
        await nearAuth.signIn();
      }
      const { contractAddress, txHash } = await deployOrderPayment(total);
      pay = { ...pay, contractAddress, txHash };
    }

    if (!pay?.buyerAddress) {
      pay = { ...pay, buyerAddress: nearAuth.getAccountId() || undefined };
    }

    const orderId = randomUUID();
    const timestamp = new Date().toISOString();
    const itemsHash = Buffer.from(
      sha256(Buffer.from(JSON.stringify(items)))
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
    paymentMethod: 'cash_on_delivery' | 'ton' | 'card' = 'cash_on_delivery',
  ): Promise<Order[]> {
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
        paymentMethod === 'ton'
          ? {
              method: 'ton' as const,
              buyerAddress: nearAuth.getAccountId() || undefined,
              sellerAddress: store?.owner,
            }
          : paymentMethod === 'card'
          ? {
              method: 'card' as const,
              buyerAddress: nearAuth.getAccountId() || undefined,
              sellerAddress: store?.owner,
            }
          : {
              method: 'cash_on_delivery' as const,
              buyerAddress: nearAuth.getAccountId() || undefined,
              sellerAddress: store?.owner,
            };
      const order = await this.createOrder(
        userId,
        items,
        shippingAddress,
        payment,
      );
      await emitOrderEvents(order, storeId);
      orders.push(order);
    }
    return orders;
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
    const actor = nearAuth.getAccountId();
    const network =
      (config.TON_NETWORK || process.env.TON_NETWORK || 'mainnet').toLowerCase();
    const legacy =
      config.ADMIN_WALLET_ADDRESS || process.env.ADMIN_WALLET_ADDRESS || '';
    const admin =
      network === 'testnet'
        ? config.ADMIN_WALLET_ADDRESS_TESTNET ||
          process.env.ADMIN_WALLET_ADDRESS_TESTNET ||
          legacy
        : config.ADMIN_WALLET_ADDRESS_MAINNET ||
          process.env.ADMIN_WALLET_ADDRESS_MAINNET ||
          legacy;
    if (admin && (!actor || actor !== admin)) {
      throw new Error('Admin wallet address required');
    }
    await adminResolve(order.escrowAddr, toSeller);
    await this.updateOrderStatus(orderId, toSeller ? 'released' : 'refunded');
  }
}

export default OrderService;
