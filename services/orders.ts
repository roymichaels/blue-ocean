import ordersAgent from '../agents/orders-agent';
import { Order, OrderStatus, CartItem, ShippingAddress, OrderTrackingStep } from '../types';
import { sha256 } from '@noble/hashes/sha256';

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
      method?: 'cash_on_delivery' | 'ton';
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

    const orderId = `order_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const itemsHash = Buffer.from(
      sha256(Buffer.from(JSON.stringify(items)))
    ).toString('hex');
    const order: Order = {
      id: orderId,
      userId,
      items,
      total,
      status: 'order_received',
      shippingAddress,
       itemsHash,
      paymentMethod: payment?.method ?? 'cash_on_delivery',
      buyerAddress: payment?.buyerAddress,
      sellerAddress: payment?.sellerAddress,
      paymentContractAddress: payment?.contractAddress,
      escrowAddr: payment?.contractAddress,
      paymentTxHash: payment?.txHash,
      createdAt: timestamp,
      updatedAt: timestamp,
      trackingSteps: this.getTrackingSteps('order_received'),
    };

    await ordersAgent.add(order);
    this.notifyListeners();
    this.simulateOrderProgress(orderId);
    return order;
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
    return ordersAgent.getAll().filter(o => o.userId === userId);
  }

  async getUserOrderCount(userId: string): Promise<number> {
    return (await this.getUserOrders(userId)).length;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = ordersAgent.get(orderId);
    if (!order) return;
    order.status = status;
    order.trackingSteps = this.getTrackingSteps(status);
    order.updatedAt = new Date().toISOString();
    await ordersAgent.update(order);
    this.notifyListeners();
  }
}

export default OrderService;
