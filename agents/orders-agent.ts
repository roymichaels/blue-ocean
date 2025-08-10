import { Order } from '../types';
import { sendWakuOrderUpdate } from '../lib/waku/sendWakuOrderUpdate';
import WakuAgent from '../utils/wakuAgent';
import {
  createOrderPayment,
  releaseFunds,
  refundOrder,
} from '../services/tonContract';

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
    const { contractAddress, txHash } = await createOrderPayment(order);
    const orderWithTx: Order = {
      ...order,
      paymentContractAddress: contractAddress,
      paymentTxHash: txHash,
    };
    await super.add(orderWithTx);
  }

  async releaseFunds(orderId: string): Promise<string> {
    const order = this.get(orderId);
    if (!order?.paymentContractAddress) {
      throw new Error('Order payment contract not found');
    }
    return await releaseFunds(order.paymentContractAddress);
  }

  async refundOrder(orderId: string): Promise<string> {
    const order = this.get(orderId);
    if (!order?.paymentContractAddress) {
      throw new Error('Order payment contract not found');
    }
    return await refundOrder(order.paymentContractAddress);
  }

  async processPayload(payload: string): Promise<void> {
    try {
      const parsed = JSON.parse(payload);
      const order = parsed.order as Order | undefined;
      const sender = parsed.sender?.address;
      if (!order || !sender) return;
      const existing = this.get(order.id) ?? order;
      const allowed = [existing.buyerAddress, existing.sellerAddress].filter(Boolean);
      if (!allowed.includes(sender)) {
        console.error('Unauthorized order update sender');
        return;
      }
    } catch (e) {
      console.error('Invalid order payload', e);
      return;
    }
    await super.processPayload(payload);
  }

  subscribe(cb: (o: Order) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (o: Order) => void) {
    this.subscribers.delete(cb);
  }
}

export default new OrdersAgent();
