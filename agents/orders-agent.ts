import { Order } from '../types';
import tonAuth from '../services/tonAuth';
import { setOrder, getOrder, listOrders, removeOrder, listOrdersBySeller } from '../services/tonOrders';
import {
  createOrderPayment,
  releaseFunds,
  refundOrder,
} from '../services/tonContract';

class OrdersAgent {
  private subscribers: Set<(o: Order) => void> = new Set();

  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage orders.');
    }
  }

  async add(order: Order): Promise<void> {
    await this.ensureWallet();
    const { contractAddress, txHash } = await createOrderPayment(order);
    const enriched: Order = {
      ...order,
      paymentContractAddress: contractAddress,
      paymentTxHash: txHash,
    };
    await setOrder(enriched);
    this.subscribers.forEach((cb) => cb(enriched));
  }

  async update(order: Order): Promise<void> {
    await this.ensureWallet();
    await setOrder(order);
    this.subscribers.forEach((cb) => cb(order));
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    await removeOrder(id);
  }

  async get(id: string): Promise<Order | null> {
    return await getOrder(id);
  }

  async getAll(): Promise<Order[]> {
    return await listOrders();
  }

  async getBySeller(address: string): Promise<Order[]> {
    return await listOrdersBySeller(address);
  }

  async releaseFunds(orderId: string): Promise<string> {
    await this.ensureWallet();
    const order = await this.get(orderId);
    if (!order?.paymentContractAddress) {
      throw new Error('Order payment contract not found');
    }
    return await releaseFunds(order.paymentContractAddress);
  }

  async refundOrder(orderId: string): Promise<string> {
    await this.ensureWallet();
    const order = await this.get(orderId);
    if (!order?.paymentContractAddress) {
      throw new Error('Order payment contract not found');
    }
    return await refundOrder(order.paymentContractAddress);
  }

  subscribe(cb: (o: Order) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (o: Order) => void) {
    this.subscribers.delete(cb);
  }
}

export default new OrdersAgent();
