import { Order, OrderStatus, Notification } from '../types';
import tonAuth from '../services/tonAuth';
import notificationsAgent from './notifications-agent';
import { setOrder, getOrder, listOrders, removeOrder, listOrdersBySeller } from '../services/tonOrders';
import {
  deployOrderPayment,
  releasePayment,
  refundPayment,
} from '../services/tonContract';

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  order_received: ['courier_found'],
  courier_found: ['courier_picked_up'],
  courier_picked_up: ['courier_on_way'],
  courier_on_way: ['delivered'],
  delivered: ['released', 'refunded'],
  released: [],
  refunded: [],
};

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
    const current = await this.get(order.id);
    if (!current) {
      throw new Error('Order not found');
    }
    let statusChanged = false;
    if (order.status !== current.status) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[current.status] || [];
      if (!allowed.includes(order.status)) {
        throw new Error(`Invalid status transition from ${current.status} to ${order.status}`);
      }
      statusChanged = true;
    }
    await setOrder(order);
    this.subscribers.forEach((cb) => cb(order));
    if (statusChanged) {
      await this.notifyStatusChange(order);
    }
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
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes('released')) {
      throw new Error(`Invalid status transition from ${order.status} to released`);
    }
    const hash = await releasePayment(order.paymentContractAddress);
    const updated: Order = {
      ...order,
      status: 'released',
      updatedAt: new Date().toISOString(),
    };
    await setOrder(updated);
    this.subscribers.forEach((cb) => cb(updated));
    await this.notifyStatusChange(updated);
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
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes('refunded')) {
      throw new Error(`Invalid status transition from ${order.status} to refunded`);
    }
    const hash = await refundPayment(order.paymentContractAddress);
    const updated: Order = {
      ...order,
      status: 'refunded',
      updatedAt: new Date().toISOString(),
    };
    await setOrder(updated);
    this.subscribers.forEach((cb) => cb(updated));
    await this.notifyStatusChange(updated);
    return hash;
  }

  subscribe(cb: (o: Order) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (o: Order) => void) {
    this.subscribers.delete(cb);
  }

  private async notifyStatusChange(order: Order) {
    const notification: Notification = {
      id: `ntf_${Date.now()}`,
      userId: order.userId,
      title: 'Order status updated',
      message: `Order ${order.id} status changed to ${order.status}`,
      type: 'order',
      read: false,
      timestamp: Date.now(),
    };
    try {
      await notificationsAgent.add(notification);
    } catch (err) {
      console.error('Failed to send notification', err);
    }
  }
}

export default new OrdersAgent();
