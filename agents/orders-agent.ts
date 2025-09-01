import { uuid } from '../utils/uuid';
import { Order, OrderStatus, Notification, OrderTrackingStep } from '../types';
import nearAuth from '@/features/auth/services/nearAuth';
import notificationsAgent from './notifications-agent';
import { assertNearChain } from '../services/chain';
import {
  setOrder,
  getOrder,
  listOrders,
  removeOrder,
  listOrdersBySeller,
} from '../services/nearOrders';
import storesAgent from './stores-agent';
import SettingsAgent from './settings-agent';
import {
  deployOrderPayment,
  releasePayment,
  refundPayment,
} from '../services/nearContract';
import productsAgent from './products-agent';
import { getSellerPublicKey } from '@/features/stores/services/sellerRegistry';

assertNearChain();
import { encryptShippingInfo } from '../utils/shippingCrypto';
import { sha256 } from '@noble/hashes/sha256';
import { logOrderEvent } from '../services/eventLog';
import ensureTonWallet from '../utils/ensureTonWallet';
import eventBus from '../services/eventBus';
import { errorLog, warnLog } from '../utils/logger';
import {
  LightNode,
  createLightNode,
  waitForRemotePeer,
  createDecoder,
  Protocols,
  bytesToUtf8,
} from '@waku/sdk';
import { getWakuBootstrapNodes } from '../utils/appConfig';
import { verifyBeforeWrite } from '../utils/verifyBeforeWrite';
import { orderStatusMessageSchema } from '../schemas/waku/order.status';
import { buildTopic } from '../utils/wakuTopics';

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  order_received: ['courier_found'],
  courier_found: ['courier_picked_up'],
  courier_picked_up: ['courier_on_way'],
  courier_on_way: ['delivered'],
  delivered: ['released', 'refunded', 'disputed'],
  disputed: ['released', 'refunded'],
  released: [],
  refunded: [],
};

class OrdersAgent {
  private subscribers: Set<(o: Order) => void> = new Set();
  private sellerMetrics: Record<string, { completed: number; refunds: number }> = {};
  private node: LightNode | null = null;
  private storeMap: Map<string, string> = new Map();
  private knownStores: Set<string> = new Set();
  private subscribedStores: Set<string> = new Set();

  constructor() {}

  private buildBaseEvent(order: Order) {
    return {
      id: order.id,
      orderId: order.id,
      storeId: order.items?.[0]?.product?.storeId || '',
      buyerAddress: order.buyerAddress,
      sellerAddress: order.sellerAddress,
      payment: {
        method: order.paymentMethod,
        contractAddress: order.paymentContractAddress,
        txHash: order.paymentTxHash,
        total: order.total,
      },
    };
  }

  private async recordSellerMetric(seller?: string, type?: 'completed' | 'refunded') {
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
    await storesAgent.updateReputationByOwner(seller, score);
  }

  getSellerMetrics(address: string) {
    return this.sellerMetrics[address] || { completed: 0, refunds: 0 };
  }

  private async ensureNode(): Promise<LightNode | null> {
    if (this.node) return this.node;
    try {
      const bootstrap = getWakuBootstrapNodes();
      if (bootstrap.length === 0) return null;
      this.node = await createLightNode({ libp2p: { bootstrap } as any });
      await this.node.start();
      await waitForRemotePeer(this.node, [Protocols.Relay]);
      return this.node;
    } catch (err) {
      errorLog('Failed to start Waku node', err);
      this.node = null;
      return null;
    }
  }

  private async subscribeStore(storeId: string) {
    if (this.subscribedStores.has(storeId)) return;
    const n = await this.ensureNode();
    if (!n) return;
    const decoder = createDecoder(buildTopic('orders', storeId));
    const handler = async (wakuMsg: any) => {
      if (!wakuMsg.payload) return;
      try {
        const raw = JSON.parse(bytesToUtf8(wakuMsg.payload));
        const signed = await verifyBeforeWrite(raw, orderStatusMessageSchema);
        if (!signed) return;
        const { orderId, status } = signed.payload;
        await this.applyRemoteStatus(orderId, status);
      } catch (err) {
        errorLog('Failed to process order status update', err);
      }
    };
    (n.relay as any).addObserver(handler, [decoder]);
    this.subscribedStores.add(storeId);
  }

  private getTrackingSteps(status: OrderStatus): OrderTrackingStep[] {
    const allSteps: OrderTrackingStep[] = [
      { status: 'order_received', title: 'הזמנה התקבלה', timestamp: new Date().toISOString(), completed: false },
      { status: 'courier_found', title: 'נמצא שליח מתאים', timestamp: '', completed: false },
      { status: 'courier_picked_up', title: 'שליח אסף את ההזמנה', timestamp: '', completed: false },
      { status: 'courier_on_way', title: 'שליח בדרך אלייך', timestamp: '', completed: false },
      { status: 'delivered', title: 'הזמנה התקבלה (השאר ביקורת)', timestamp: '', completed: false },
    ];
    const statusOrder: OrderStatus[] = [
      'order_received',
      'courier_found',
      'courier_picked_up',
      'courier_on_way',
      'delivered',
    ];
    const currentIndex = statusOrder.indexOf(status);
    for (let i = 0; i <= currentIndex; i++) {
      allSteps[i].completed = true;
      if (!allSteps[i].timestamp) {
        const now = new Date();
        const minutesAgo = (currentIndex - i) * 10;
        allSteps[i].timestamp = new Date(now.getTime() - minutesAgo * 60000).toISOString();
      }
    }
    return allSteps;
  }

  private async applyRemoteStatus(orderId: string, status: OrderStatus) {
    const order = await this.get(orderId);
    if (!order) return;
    if (order.status === status) return;
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) return;
    const updated: Order = {
      ...order,
      status,
      trackingSteps: this.getTrackingSteps(status),
      updatedAt: new Date().toISOString(),
    };
    const sid = updated.items?.[0]?.product?.storeId || '';
    this.storeMap.set(updated.id, sid);
    this.knownStores.add(sid);
    await setOrder(sid, updated);
    this.subscribers.forEach((cb) => cb(updated));
    await this.notifyStatusChange(updated);
  }

  private async ensureWallet() {
    await ensureTonWallet('Please connect your NEAR wallet to manage orders.');
  }

  private async ensureAuthorized(order: Order) {
    await this.ensureWallet();
    const address = nearAuth.getAccountId();
    let allowed = [
      order.buyerAddress,
      order.sellerAddress,
      order.driverAddress,
    ].filter(Boolean) as string[];
    if (!address || !allowed.includes(address)) {
      const admins = await SettingsAgent.getInstance().getAdmins();
      allowed = allowed.concat(admins);
      if (!address || !allowed.includes(address)) {
        throw new Error('Unauthorized order update');
      }
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
    // ensure integrity of items by hashing their serialized form
    if (!toStore.itemsHash) {
      toStore.itemsHash = Buffer.from(
        sha256(Buffer.from(JSON.stringify(enriched.items)))
      ).toString('hex');
    }
    // encrypt shipping address for seller-only visibility
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
        errorLog('Failed to encrypt shipping address', err);
        warnLog('Failed to encrypt shipping address', err);
      }
    }
    {
      const sid = toStore.items?.[0]?.product?.storeId || '';
      this.storeMap.set(toStore.id, sid);
      this.knownStores.add(sid);
      await setOrder(sid, toStore);
      await this.subscribeStore(sid);
    }
    await logOrderEvent({
      tenant: enriched.items?.[0]?.product?.storeId || '',
      type: 'order.created',
      payload: {
        orderId: enriched.id,
        prevStatus: null,
        newStatus: enriched.status,
      },
      actor: nearAuth.getAccountId() || '',
      timestamp: Date.now(),
    });
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
    {
      const sid = order.items?.[0]?.product?.storeId || '';
      this.storeMap.set(order.id, sid);
      this.knownStores.add(sid);
      await setOrder(sid, order);
      await this.subscribeStore(sid);
    }
    await logOrderEvent({
      tenant: order.items?.[0]?.product?.storeId || '',
      type: 'order.updated',
      payload: {
        orderId: order.id,
        prevStatus: current.status,
        newStatus: order.status,
      },
      actor: nearAuth.getAccountId() || '',
      timestamp: Date.now(),
    });
    const sid = order.items?.[0]?.product?.storeId || '';
    await eventBus.publish(buildTopic('orders', sid), 'order.updated', {
      ...this.buildBaseEvent(order),
      prevStatus: current.status,
      newStatus: order.status,
    });
    this.subscribers.forEach((cb) => cb(order));
    if (statusChanged) {
      await this.notifyStatusChange(order);
      if (order.status === 'released') {
        await this.recordSellerMetric(order.sellerAddress, 'completed');
      } else if (order.status === 'refunded') {
        await this.recordSellerMetric(order.sellerAddress, 'refunded');
      }
      if (order.status === 'disputed' || current.status === 'disputed') {
        await eventBus.publish(buildTopic('orders', sid), 'dispute.updated', {
          ...this.buildBaseEvent(order),
          prevStatus: current.status,
          newStatus: order.status,
        });
        await this.notifyDisputeUpdate(order);
      }
    }
  }

  async remove(id: string): Promise<void> {
    const order = await this.get(id);
    if (!order) {
      throw new Error('Order not found');
    }
    await this.ensureAuthorized(order);
    const sid = order.items?.[0]?.product?.storeId || '';
    await removeOrder(sid, id);
    this.storeMap.delete(id);
    await logOrderEvent({
      tenant: order.items?.[0]?.product?.storeId || '',
      type: 'order.deleted',
      payload: {
        orderId: id,
        prevStatus: order.status,
        newStatus: 'deleted',
      },
      actor: nearAuth.getAccountId() || '',
      timestamp: Date.now(),
    });
  }

  async get(id: string): Promise<Order | null> {
    const sid = this.storeMap.get(id) || '';
    return await getOrder(sid, id);
  }

  async getAll(): Promise<Order[]> {
    const all: Order[] = [];
    for (const sid of this.knownStores) {
      const list = await listOrders(sid);
      list.forEach((o) => this.storeMap.set(o.id, sid));
      all.push(...list);
    }
    return all;
  }

  async getBySeller(address: string): Promise<Order[]> {
    const all: Order[] = [];
    for (const sid of this.knownStores) {
      const list = await listOrdersBySeller(sid, address);
      list.forEach((o) => this.storeMap.set(o.id, sid));
      all.push(...list);
    }
    return all;
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
    {
      const sid = updated.items?.[0]?.product?.storeId || '';
      this.storeMap.set(updated.id, sid);
      this.knownStores.add(sid);
      await setOrder(sid, updated);
      await this.subscribeStore(sid);
    }
    await logOrderEvent({
      tenant: updated.items?.[0]?.product?.storeId || '',
      type: 'order.updated',
      payload: {
        orderId: updated.id,
        prevStatus: order.status,
        newStatus: updated.status,
      },
      actor: nearAuth.getAccountId() || '',
      timestamp: Date.now(),
    });
    const sid = updated.items?.[0]?.product?.storeId || '';
    await eventBus.publish(buildTopic('orders', sid), 'order.updated', {
      ...this.buildBaseEvent(updated),
      prevStatus: order.status,
      newStatus: updated.status,
    });
    await eventBus.publish(buildTopic('orders', sid), 'payment.received', {
      ...this.buildBaseEvent(updated),
    });
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
    await this.recordSellerMetric(order.sellerAddress, 'completed');
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
    {
      const sid = updated.items?.[0]?.product?.storeId || '';
      this.storeMap.set(updated.id, sid);
      this.knownStores.add(sid);
      await setOrder(sid, updated);
      await this.subscribeStore(sid);
    }
    await logOrderEvent({
      tenant: updated.items?.[0]?.product?.storeId || '',
      type: 'order.updated',
      payload: {
        orderId: updated.id,
        prevStatus: order.status,
        newStatus: updated.status,
      },
      actor: nearAuth.getAccountId() || '',
      timestamp: Date.now(),
    });
    const sid = updated.items?.[0]?.product?.storeId || '';
    await eventBus.publish(buildTopic('orders', sid), 'order.updated', {
      ...this.buildBaseEvent(updated),
      prevStatus: order.status,
      newStatus: updated.status,
    });
    this.subscribers.forEach((cb) => cb(updated));
    await this.notifyStatusChange(updated);
    await this.recordSellerMetric(order.sellerAddress, 'refunded');
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
      id: uuid(),
      userId: order.userId,
      title: 'Order status updated',
      message: `Order ${order.id} status changed to ${order.status}`,
      type: 'order',
      read: false,
      timestamp: Date.now(),
    };
    try {
      const sid = order.items?.[0]?.product?.storeId || '';
      await notificationsAgent.broadcast('status.updated', notification, sid);
    } catch (err) {
      errorLog('Failed to send notification', err);
    }
  }

  private async notifyOrderCreated(order: Order) {
    const notification: Notification = {
      id: uuid(),
      userId: order.userId,
      title: 'Order created',
      message: `Order ${order.id} has been created`,
      type: 'order',
      read: false,
      timestamp: Date.now(),
    };
    try {
      const sid = order.items?.[0]?.product?.storeId || '';
      await notificationsAgent.broadcast('order.created', notification, sid);
    } catch (err) {
      errorLog('Failed to send notification', err);
    }
  }

  private async notifyPaymentReceived(order: Order) {
    const notification: Notification = {
      id: uuid(),
      userId: order.userId,
      title: 'Payment received',
      message: `Payment for order ${order.id} has been released`,
      type: 'order',
      read: false,
      timestamp: Date.now(),
    };
    try {
      const sid = order.items?.[0]?.product?.storeId || '';
      await notificationsAgent.broadcast('payment.received', notification, sid);
    } catch (err) {
      errorLog('Failed to send notification', err);
    }
  }

  private async notifyDisputeUpdate(order: Order) {
    const notification: Notification = {
      id: uuid(),
      userId: order.userId,
      title: 'Order dispute updated',
      message: `Order ${order.id} dispute status: ${order.status}`,
      type: 'order',
      read: false,
      timestamp: Date.now(),
    };
    try {
      const sid = order.items?.[0]?.product?.storeId || '';
      await notificationsAgent.broadcast('dispute.updated', notification, sid);
    } catch (err) {
      errorLog('Failed to send notification', err);
    }
  }
}

export default new OrdersAgent();
