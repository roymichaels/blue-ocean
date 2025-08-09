import { Order } from '../types';
import { sendWakuOrderUpdate } from '../lib/waku/sendWakuOrderUpdate';
import WakuAgent from '../utils/wakuAgent';
import { payOrder } from '../services/tonContract';

class OrdersAgent extends WakuAgent<Order> {
  private subscribers: Set<(o: Order) => void> = new Set();

  constructor() {
    super(sendWakuOrderUpdate, {
      topic: '/congress/orders/1/proto',
      replayHistory: true,
      extractItem: (msg: any) => msg.order as Order,
      onUpdate: (order: Order) => {
        this.subscribers.forEach(cb => cb(order));
      },
    });
  }

  async add(order: Order): Promise<void> {
    const txHash = await payOrder(order);
    const orderWithTx: Order = { ...order, paymentTxHash: txHash };
    await super.add(orderWithTx);
  }

  subscribe(cb: (o: Order) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (o: Order) => void) {
    this.subscribers.delete(cb);
  }
}

export default new OrdersAgent();
