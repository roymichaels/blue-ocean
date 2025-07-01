import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, OrderStatus, OrderTrackingStep, CartItem, ShippingAddress } from '../types';

const ORDERS_STORAGE_KEY = 'user_orders';

class OrderService {
  private static instance: OrderService;
  private orders: Order[] = [];
  private listeners: (() => void)[] = [];

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  constructor() {
    this.loadFromStorage();
  }

  private async loadFromStorage() {
    try {
      const ordersData = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
      if (ordersData) {
        this.orders = JSON.parse(ordersData);
      }
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading orders from storage:', error);
    }
  }

  private async saveToStorage() {
    try {
      await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(this.orders));
    } catch (error) {
      console.error('Error saving orders to storage:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  public addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  public removeListener(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private getTrackingSteps(status: OrderStatus): OrderTrackingStep[] {
    const allSteps: OrderTrackingStep[] = [
      {
        status: 'order_received',
        title: 'הזמנה התקבלה',
        timestamp: new Date().toISOString(),
        completed: false
      },
      {
        status: 'courier_found',
        title: 'נמצא שליח מתאים',
        timestamp: '',
        completed: false
      },
      {
        status: 'courier_picked_up',
        title: 'שליח אסף את ההזמנה',
        timestamp: '',
        completed: false
      },
      {
        status: 'courier_on_way',
        title: 'שליח בדרך אלייך',
        timestamp: '',
        completed: false
      },
      {
        status: 'delivered',
        title: 'הזמנה התקבלה (השאר ביקורת)',
        timestamp: '',
        completed: false
      }
    ];

    const statusOrder: OrderStatus[] = [
      'order_received',
      'courier_found', 
      'courier_picked_up',
      'courier_on_way',
      'delivered'
    ];

    const currentIndex = statusOrder.indexOf(status);
    
    // Mark completed steps
    for (let i = 0; i <= currentIndex; i++) {
      allSteps[i].completed = true;
      if (!allSteps[i].timestamp) {
        // Calculate a realistic timestamp for each step
        const now = new Date();
        const minutesAgo = (currentIndex - i) * 10; // Each step happened 10 minutes before the next
        allSteps[i].timestamp = new Date(now.getTime() - minutesAgo * 60000).toISOString();
      }
    }

    return allSteps;
  }

  public async createOrder(
    userId: string,
    items: CartItem[],
    shippingAddress: ShippingAddress
  ): Promise<Order> {
    const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    const order: Order = {
      id: `order_${Date.now()}`,
      userId,
      items,
      total,
      status: 'order_received',
      shippingAddress,
      paymentMethod: 'cash_on_delivery',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackingSteps: this.getTrackingSteps('order_received')
    };

    this.orders.unshift(order); // Add to beginning
    await this.saveToStorage();
    this.notifyListeners();

    // Simulate order progression
    this.simulateOrderProgress(order.id);

    return order;
  }

  private async simulateOrderProgress(orderId: string) {
    const statusProgression: OrderStatus[] = [
      'courier_found',
      'courier_picked_up', 
      'courier_on_way',
      'delivered'
    ];

    // More realistic delays for demo purposes
    const delays = [30000, 60000, 120000, 180000]; // 30s, 1m, 2m, 3m

    for (let i = 0; i < statusProgression.length; i++) {
      setTimeout(async () => {
        await this.updateOrderStatus(orderId, statusProgression[i]);
      }, delays[i]);
    }
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const orderIndex = this.orders.findIndex(order => order.id === orderId);
    if (orderIndex >= 0) {
      this.orders[orderIndex].status = status;
      this.orders[orderIndex].updatedAt = new Date().toISOString();
      this.orders[orderIndex].trackingSteps = this.getTrackingSteps(status);
      
      await this.saveToStorage();
      this.notifyListeners();
    }
  }

  public getOrders(): Order[] {
    return [...this.orders];
  }

  public getOrder(orderId: string): Order | undefined {
    return this.orders.find(order => order.id === orderId);
  }

  public getUserOrders(userId: string): Order[] {
    return this.orders.filter(order => order.userId === userId);
  }

  // Cancel an order (only possible if not yet picked up)
  public async cancelOrder(orderId: string): Promise<boolean> {
    const orderIndex = this.orders.findIndex(order => order.id === orderId);
    if (orderIndex >= 0) {
      const order = this.orders[orderIndex];
      
      // Can only cancel if not yet picked up
      if (order.status === 'order_received' || order.status === 'courier_found') {
        // Mark as cancelled (we could add a 'cancelled' status, but for simplicity we'll just remove it)
        this.orders.splice(orderIndex, 1);
        await this.saveToStorage();
        this.notifyListeners();
        return true;
      }
    }
    return false;
  }

  // Get order count for a user
  public getUserOrderCount(userId: string): number {
    return this.orders.filter(order => order.userId === userId).length;
  }

  // Get total spent by a user
  public getUserTotalSpent(userId: string): number {
    return this.orders
      .filter(order => order.userId === userId && order.status === 'delivered')
      .reduce((total, order) => total + order.total, 0);
  }
}

export default OrderService;