import { Order } from '../types';
import { sendWakuOrderUpdate } from '../lib/waku/sendWakuOrderUpdate';
import WakuAgent from '../utils/wakuAgent';

class OrdersAgent extends WakuAgent<Order> {
  private subscribers: Set<(o: Order) => void> = new Set();

  constructor() {
    super(sendWakuOrderUpdate, {
      topic: '/congress/orders/1/proto',
      replayHistory: true,
      extractItem: (msg: any) => msg.order as Order,
      validateMessage: (msg: any) =>
        ['admin', 'user', 'driver'].includes(msg.sender.role) &&
        (msg.sender.role === 'admin' || msg.order?.userId === msg.sender.id),
      onUpdate: (order: Order) => {
        this.subscribers.forEach(cb => cb(order));
      },
    });
  }

  subscribe(cb: (o: Order) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (o: Order) => void) {
    this.subscribers.delete(cb);
  }
}

export default new OrdersAgent();
