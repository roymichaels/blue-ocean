import { Order } from '../types';
import { sendWakuOrderUpdate } from '../lib/waku/sendWakuOrderUpdate';
import WakuAgent from '../utils/wakuAgent';

class OrdersAgent extends WakuAgent<Order> {
  constructor() {
    super(sendWakuOrderUpdate, {
      topic: '/congress/orders/1/proto',
      replayHistory: true,
      extractItem: (msg: any) => msg.order as Order,
      allowedRoles: ['admin', 'user', 'driver'],
      validateMessage: (msg: any) =>
        msg.sender.role === 'admin' || msg.order?.userId === msg.sender.id,
    });
  }
}

export default new OrdersAgent();
