import { store } from '../lib/memoryStore';
import { Order, OrderStatus, OrderTrackingStep, CartItem, ShippingAddress } from '../types';
import { sendWakuOrderUpdate } from '../lib/waku/sendWakuOrderUpdate';
import { isWakuConfigured } from '../lib/waku/isWakuConfigured';

class OrderService {
  private static instance: OrderService;
  private listeners: (() => void)[] = [];

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  private constructor() {}

  private notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  public addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  public removeListener(listener: () => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private getTrackingSteps(status: OrderStatus): OrderTrackingStep[] {
    const allSteps: OrderTrackingStep[] = [
      { status: 'order_received', title: 'הזמנה התקבלה', timestamp: new Date().toISOString(), completed: false },
      { status: 'courier_found', title: 'נמצא שליח מתאים', timestamp: '', completed: false },
      { status: 'courier_picked_up', title: 'שליח אסף את ההזמנה', timestamp: '', completed: false },
      { status: 'courier_on_way', title: 'שליח בדרך אלייך', timestamp: '', completed: false },
      { status: 'delivered', title: 'הזמנה התקבלה (השאר ביקורת)', timestamp: '', completed: false }
    ];
    const statusOrder: OrderStatus[] = ['order_received','courier_found','courier_picked_up','courier_on_way','delivered'];
    const currentIndex = statusOrder.indexOf(status);
    for (let i=0;i<=currentIndex;i++) {
      allSteps[i].completed = true;
      if (!allSteps[i].timestamp) {
        const now = new Date();
        const minutesAgo = (currentIndex - i) * 10;
        allSteps[i].timestamp = new Date(now.getTime() - minutesAgo*60000).toISOString();
      }
    }
    return allSteps;
  }

  public async createOrder(userId: string, items: CartItem[], shippingAddress: ShippingAddress): Promise<Order> {
    const total = items.reduce((sum, item) => {
      const price = item.unitPrice ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);
    const orderId = `order_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const order: Order = {
      id: orderId,
      userId,
      items,
      total,
      status: 'order_received',
      shippingAddress,
      paymentMethod: 'cash_on_delivery',
      createdAt: timestamp,
      updatedAt: timestamp,
      trackingSteps: this.getTrackingSteps('order_received'),
    };
    store.orders.set(orderId, order);
    this.notifyListeners();
    this.simulateOrderProgress(orderId);
    if (await isWakuConfigured()) {
      await sendWakuOrderUpdate(order);
    }
    return order;
  }

  private simulateOrderProgress(orderId: string) {
    const statusProgression: OrderStatus[] = ['courier_found','courier_picked_up','courier_on_way','delivered'];
    const delays = [30000,60000,120000,180000];
    for (let i=0;i<statusProgression.length;i++) {
      setTimeout(async () => {
        await this.updateOrderStatus(orderId, statusProgression[i]);
      }, delays[i]);
    }
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = store.orders.get(orderId);
    if (!order) return;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.trackingSteps = this.getTrackingSteps(status);
    this.notifyListeners();
    if (await isWakuConfigured()) {
      await sendWakuOrderUpdate(order);
    }
  }

  private async mapOrder(order: Order): Promise<Order> {
    return { ...order };
  }

  public async getOrders(): Promise<Order[]> {
    const orders: Order[] = [];
    for (const o of store.orders.values()) {
      orders.push(await this.mapOrder(o));
    }
    return orders;
  }

  public async getOrder(orderId: string): Promise<Order | null> {
    const o = store.orders.get(orderId);
    return o ? this.mapOrder(o) : null;
  }

  public async getUserOrders(userId: string): Promise<Order[]> {
    const orders: Order[] = [];
    for (const o of store.orders.values()) {
      if (o.userId === userId) orders.push(await this.mapOrder(o));
    }
    return orders;
  }

  public async cancelOrder(orderId: string): Promise<boolean> {
    const order = store.orders.get(orderId);
    if (!order) return false;
    if (order.status === 'order_received' || order.status === 'courier_found') {
      store.orders.delete(orderId);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public async getUserOrderCount(userId: string): Promise<number> {
    let count = 0;
    for (const o of store.orders.values()) {
      if (o.userId === userId) count++;
    }
    return count;
  }

  public async getUserTotalSpent(userId: string): Promise<number> {
    let sum = 0;
    for (const o of store.orders.values()) {
      if (o.userId === userId && o.status === 'delivered') sum += o.total;
    }
    return sum;
  }
}

export default OrderService;
