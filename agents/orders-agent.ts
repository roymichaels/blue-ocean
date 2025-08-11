import { Order } from '../types';
import tonAuth from '../services/tonAuth';
import { setOrder, getOrder, listOrders, removeOrder, listOrdersBySeller } from '../services/tonOrders';
import {
  deployOrderPayment,
  releasePayment,
  refundPayment,
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
    let enriched = order;
    if (!order.paymentContractAddress || !order.paymentTxHash) {
      const { contractAddress, txHash } = await deployOrderPayment(order.total);
      enriched = {
        ...order,
        paymentContractAddress: contractAddress,
        paymentTxHash: txHash,
      };
    }
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

  async releasePayment(orderId: string): Promise<string> {
    await this.ensureWallet();
    const order = await this.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    if (!order.paymentContractAddress) {
      throw new Error('Order payment contract not found');
    }
    const hash = await releasePayment(order.paymentContractAddress);
    const updated: Order = {
      ...order,
      status: 'released',
      updatedAt: new Date().toISOString(),
    };
    await setOrder(updated);
    this.subscribers.forEach((cb) => cb(updated));
    return hash;
  }

  async refundPayment(orderId: string): Promise<string> {
    await this.ensureWallet();
    const order = await this.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    if (!order.paymentContractAddress) {
      throw new Error('Order payment contract not found');
    }
    const hash = await refundPayment(order.paymentContractAddress);
    const updated: Order = {
      ...order,
      status: 'refunded',
      updatedAt: new Date().toISOString(),
    };
    await setOrder(updated);
    this.subscribers.forEach((cb) => cb(updated));
    return hash;
  }

  subscribe(cb: (o: Order) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (o: Order) => void) {
    this.subscribers.delete(cb);
  }
}

export default new OrdersAgent();
