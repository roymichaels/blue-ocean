import ordersAgent from '../agents/orders-agent';
import { OrderStatus } from '../types';

class OrderService {
  private static instance: OrderService;

  private constructor() {}

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }
  async getOrder(id: string) {

    return ordersAgent.get(id) || null;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = ordersAgent.get(orderId);
    if (!order) return;
    order.status = status;
    await ordersAgent.update(order);
  }
}

export default OrderService;
