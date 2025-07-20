import { executeSql } from '../lib/sqlite';
import { Order, OrderStatus, OrderTrackingStep, CartItem, ShippingAddress } from '../types';
import DatabaseService from './database';
import { TENANT } from '../constants/tenant';

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
    this.listeners.forEach((listener) => listener());
  }

  public addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  public removeListener(listener: () => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
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
    shippingAddress: ShippingAddress,
  ): Promise<Order> {
    const total = items.reduce((sum, item) => {
      const price = item.unitPrice ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const orderId = `order_${Date.now()}`;
    const timestamp = new Date().toISOString();

    await executeSql(
      `INSERT INTO orders (
        id, tenant_id, user_id, total, status, payment_method,
        shipping_name, shipping_phone, shipping_street, shipping_city,
        shipping_postal_code, shipping_notes, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        orderId,
        TENANT,
        userId,
        total,
        'order_received',
        'cash_on_delivery',
        shippingAddress.name,
        shippingAddress.phone,
        shippingAddress.street,
        shippingAddress.city,
        shippingAddress.postalCode,
        shippingAddress.notes ?? null,
        timestamp,
        timestamp,
      ],
    );

    for (const item of items) {
      const price = item.unitPrice ?? item.product.price;
      await executeSql(
        `INSERT INTO order_items (
          id, order_id, product_id, product_name, product_image,
          quantity, price, selected_color, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          orderId,
          item.product.id,
          item.product.name,
          item.product.images[0],
          item.quantity,
          price,
          item.selectedColor ?? null,
          timestamp,
        ],
      );
    }

    const order = await this.getOrder(orderId);
    this.notifyListeners();

    // Simulate order progression
    this.simulateOrderProgress(orderId);

    if (!order) {
      throw new Error('ORDER_NOT_CREATED');
    }
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
    await executeSql('UPDATE orders SET status=? WHERE id=?', [status, orderId]);
    this.notifyListeners();
  }

  private async mapOrderRow(row: any): Promise<Order> {
    const itemsRes = await executeSql('SELECT * FROM order_items WHERE order_id=?', [row.id]);
    const itemRows = (itemsRes.rows as any)._array || [];
    const db = DatabaseService.getInstance();
    const items: CartItem[] = [];
    for (const r of itemRows) {
      const product = await db.getProduct(r.product_id);
      if (!product) continue;
      items.push({
        id: r.id,
        productId: r.product_id,
        product,
        quantity: r.quantity,
        addedAt: r.created_at,
        unitPrice: r.price,
        selectedColor: r.selected_color || undefined,
      });
    }

    return {
      id: row.id,
      userId: row.user_id,
      items,
      total: Number(row.total),
      status: row.status as OrderStatus,
      shippingAddress: {
        name: row.shipping_name,
        phone: row.shipping_phone,
        street: row.shipping_street,
        city: row.shipping_city,
        postalCode: row.shipping_postal_code || '',
        notes: row.shipping_notes || undefined,
      },
      paymentMethod: row.payment_method,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      trackingSteps: this.getTrackingSteps(row.status as OrderStatus),
    };
  }

  public async getOrders(): Promise<Order[]> {
    const res = await executeSql('SELECT * FROM orders WHERE tenant_id=? ORDER BY created_at DESC', [TENANT]);
    const rows = (res.rows as any)._array || [];
    const orders: Order[] = [];
    for (const row of rows) {
      orders.push(await this.mapOrderRow(row));
    }
    return orders;
  }

  public async getOrder(orderId: string): Promise<Order | null> {
    const res = await executeSql('SELECT * FROM orders WHERE id=? LIMIT 1', [orderId]);
    const row = (res.rows as any)._array?.[0];
    if (!row) return null;
    return this.mapOrderRow(row);
  }

  public async getUserOrders(userId: string): Promise<Order[]> {
    const res = await executeSql(
      'SELECT * FROM orders WHERE user_id=? AND tenant_id=? ORDER BY created_at DESC',
      [userId, TENANT],
    );
    const rows = (res.rows as any)._array || [];
    const orders: Order[] = [];
    for (const row of rows) {
      orders.push(await this.mapOrderRow(row));
    }
    return orders;
  }

  public async cancelOrder(orderId: string): Promise<boolean> {
    const order = await this.getOrder(orderId);
    if (!order) return false;
    if (order.status === 'order_received' || order.status === 'courier_found') {
      await executeSql('DELETE FROM orders WHERE id=?', [orderId]);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public async getUserOrderCount(userId: string): Promise<number> {
    const res = await executeSql(
      'SELECT COUNT(*) as cnt FROM orders WHERE user_id=? AND tenant_id=?',
      [userId, TENANT],
    );
    return (res.rows as any)._array?.[0]?.cnt ?? 0;
  }

  public async getUserTotalSpent(userId: string): Promise<number> {
    const res = await executeSql(
      "SELECT SUM(total) as sum FROM orders WHERE user_id=? AND tenant_id=? AND status='delivered'",
      [userId, TENANT],
    );
    const val = (res.rows as any)._array?.[0]?.sum;
    return val ? Number(val) : 0;
  }
}

export default OrderService;
