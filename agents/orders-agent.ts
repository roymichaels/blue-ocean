import { Order, OrderStatus, Notification } from '../types';
import tonAuth from '../services/tonAuth';
import notificationsAgent from './notifications-agent';
import { setOrder, getOrder, listOrders, removeOrder, listOrdersBySeller } from '../services/tonOrders';
import storesAgent from './stores-agent';
import {
  deployOrderPayment,
  releasePayment,
  refundPayment,
} from '../services/tonContract';
import productsAgent from './products-agent';
import { getSellerPublicKey } from '../services/sellerRegistry';
import { encryptShippingInfo } from '../utils/shippingCrypto';
import { sha256 } from '@noble/hashes/sha256';

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
  private sellerMetrics: Record<string, { completed: number; refunds: number }> = {};

  private recordSellerMetric(seller?: string, type?: 'completed' | 'refunded') {
    if (!seller) return;
    if (!this.sellerMetrics[seller]) {
      this.sellerMetrics[seller] = { completed: 0, refunds: 0 };
    }
    if (type === 'completed') {
      this.sellerMetrics[seller].completed += 1;
    } else if (type === 'refunded') {
      this.sellerMetrics[seller].refunds += 1;
    }
    const { completed, refunds } = this.sellerMetrics[seller];
    const score = completed + refunds > 0 ? completed / (completed + refunds) : 0;
    storesAgent.updateReputationByOwner(seller, score);
  }

  getSellerMetrics(address: string) {
    return this.sellerMetrics[address] || { completed: 0, refunds: 0 };
  }

  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage orders.');
    }
  }

  private async ensureAuthorized(order: Order) {
    await this.ensureWallet();
    const address = tonAuth.getAddress();
    const allowed = [order.buyerAddress, order.sellerAddress, order.driverAddress].filter(Boolean);
    if (!address || !allowed.includes(address)) {
      throw new Error('Unauthorized order update');
    }
  }

  async add(order: Order): Promise<void> {
    await this.ensureAuthorized(order);
    let enriched = order;
    if (!order.paymentContractAddress || !order.paymentTxHash) {
      const { contractAddress, txHash } = await deployOrderPayment(order.total);
      enriched = {
        ...order,
        paymentContractAddress: contractAddress,
        escrowAddr: contractAddress,
        paymentTxHash: txHash,
      };
    } else if (!order.escrowAddr && order.paymentContractAddress) {
      enriched = { ...order, escrowAddr: order.paymentContractAddress };
    }
    let toStore: any = { ...enriched };
    if (!toStore.itemsHash) {
      toStore.itemsHash = Buffer.from(
        sha256(Buffer.from(JSON.stringify(enriched.items)))
      ).toString('hex');
    }
    if (enriched.shippingAddress && enriched.sellerAddress) {
      try {
        const sellerPub = await getSellerPublicKey(enriched.sellerAddress);
        if (sellerPub) {
          const shipAddrEnc = await encryptShippingInfo(
            enriched.shippingAddress,
            sellerPub,
          );
          toStore = { ...toStore, shipAddrEnc };
          delete toStore.shippingAddress;
        }
      } catch (err) {
        console.warn('Failed to encrypt shipping address', err);
      }
    }
    await setOrder(toStore);
    this.subscribers.forEach((cb) => cb(enriched));
    await this.notifyOrderCreated(enriched);
  }

  async update(order: Order): Promise<void> {
    const current = await this.get(order.id);
    if (!current) {
      throw new Error('Order not found');
    }
    await this.ensureAuthorized(current);
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
      if (order.status === 'released') {
        this.recordSellerMetric(order.sellerAddress, 'completed');
      } else if (order.status === 'refunded') {
        this.recordSellerMetric(order.sellerAddress, 'refunded');
      }
    }
  }

  async remove(id: string): Promise<void> {
    const order = await this.get(id);
    if (!order) {
      throw new Error('Order not found');
    }
    await this.ensureAuthorized(order);
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
    const order = await this.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    await this.ensureAuthorized(order);
    if (!order.escrowAddr) {
      throw new Error('Order escrow address not found');
    }
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes('released')) {
      throw new Error(`Invalid status transition from ${order.status} to released`);
    }
    const hash = await releasePayment(order.escrowAddr);
    const updated: Order = {
      ...order,
      status: 'released',
      updatedAt: new Date().toISOString(),
    };
    await setOrder(updated);
    await Promise.all(
      order.items.map((item) =>
        productsAgent.decrementStock(
          item.productId,
          item.effectiveQty ?? item.quantity
        )
      )
    );
    this.subscribers.forEach((cb) => cb(updated));
    await this.notifyStatusChange(updated);
    await this.notifyPaymentReceived(updated);
    this.recordSellerMetric(order.sellerAddress, 'completed');
    return hash;
  }

  async refundPayment(orderId: string): Promise<string> {
    const order = await this.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    await this.ensureAuthorized(order);
    if (!order.escrowAddr) {
      throw new Error('Order escrow address not found');
    }
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes('refunded')) {
      throw new Error(`Invalid status transition from ${order.status} to refunded`);
    }
    const hash = await refundPayment(order.escrowAddr);
    const updated: Order = {
      ...order,
      status: 'refunded',
      updatedAt: new Date().toISOString(),
    };
    await setOrder(updated);
    this.subscribers.forEach((cb) => cb(updated));
    await this.notifyStatusChange(updated);
    this.recordSellerMetric(order.sellerAddress, 'refunded');
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
      await notificationsAgent.broadcast('status.updated', notification);
    } catch (err) {
      console.error('Failed to send notification', err);
    }
  }

  private async notifyOrderCreated(order: Order) {
    const notification: Notification = {
      id: `ntf_${Date.now()}`,
      userId: order.userId,
      title: 'Order created',
      message: `Order ${order.id} has been created`,
      type: 'order',
      read: false,
      timestamp: Date.now(),
    };
    try {
      await notificationsAgent.broadcast('order.created', notification);
    } catch (err) {
      console.error('Failed to send notification', err);
    }
  }

  private async notifyPaymentReceived(order: Order) {
    const notification: Notification = {
      id: `ntf_${Date.now()}`,
      userId: order.userId,
      title: 'Payment received',
      message: `Payment for order ${order.id} has been released`,
      type: 'order',
      read: false,
      timestamp: Date.now(),
    };
    try {
      await notificationsAgent.broadcast('payment.received', notification);
    } catch (err) {
      console.error('Failed to send notification', err);
    }
  }
}

export default new OrdersAgent();
