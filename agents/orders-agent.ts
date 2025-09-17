import { Order, OrderStatus, OrderTrackingStep } from '../types';
import nearAuth from '@/features/auth/services/nearAuth';
import notificationsAgent from './notifications-agent';
import deliveryAgent from './delivery-agent';
import { assertNearChain } from '@/services/chain';
import {
  setOrder,
  getOrder,
  listOrders,
  removeOrder,
  listOrdersBySeller,
} from '@/services/nearOrders';
import storesAgent from './stores-agent';
import SettingsAgent from './settings-agent';
import {
  deployEscrow,
  releasePayment,
  refundPayment,
  type DeployEscrowDraft,
} from '@/services/nearContract';
import productsAgent from './products-agent';
import { getSellerPublicKey } from '@/features/stores/services/sellerRegistry';
import meteredBilling from '@/billing';
import { getFeeSettings } from '@/constants/tenant';

assertNearChain();
import { encryptShippingInfo } from '../utils/shippingCrypto';
import { sha256 } from '@noble/hashes/sha256';
import { logOrderEvent } from '@/services/eventLog';
import ensureNearWallet from '../utils/ensureNearWallet';
import eventBus from '@/services/eventBus';
import { errorLog, warnLog } from '../utils/logger';
import type { LightNode } from '@waku/sdk';
import { getClient } from '@/utils/transport';
import { verifyBeforeWrite } from '../utils/verifyMessageSignature';
import { orderStatusMessageSchema } from '../schemas/waku/order.status';
import { buildTopic } from '../utils/wakuTopics';
import { normalizeMessage } from '../lib/normalizeMessage';
import AgentError from '@/types/AgentError';
import { canonicalJson } from '@/utils/serialization';

const ORDER_TOPIC = '/blue-ocean/orders/1';
const NOTIFICATION_TOPIC = '/blue-ocean/notifications/1';

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  order_received: ['courier_found', 'refunded'],
  courier_found: ['courier_picked_up', 'refunded'],
  courier_picked_up: ['courier_on_way', 'refunded'],
  courier_on_way: ['delivered', 'refunded'],
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
      sessionToken: order.sessionToken,
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
      const { createLightNode, waitForRemotePeer, Protocols } = await getClient();
      this.node = await createLightNode({} as any);
      await this.node!.start();
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
    const client = await getClient();
    const topic = buildTopic('orders', storeId);
    const decoder = client.createDecoder(topic);
    const handler = async (wakuMsg: any) => {
      if (!wakuMsg.payload) return;
      try {
        const raw = JSON.parse(client.bytesToUtf8(wakuMsg.payload));
        const signed = await verifyBeforeWrite(raw, orderStatusMessageSchema, undefined, topic);
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
    const normalized = normalizeMessage<Order>('Order', updated);
    const sid = normalized.items?.[0]?.product?.storeId || '';
    this.storeMap.set(normalized.id, sid);
    this.knownStores.add(sid);
    await setOrder(sid, normalized);
    this.subscribers.forEach((cb) => cb(normalized));
    await notificationsAgent.handleOrderEvent('status.updated', {
      orderId: normalized.id,
      userId: normalized.userId,
      storeId: sid,
      status: normalized.status,
    });
  }

  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to manage orders.');
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
      const admins = await SettingsAgent.getInstance().getAdminsWithScope(
        'admin:orders',
      );
      allowed = allowed.concat(admins);
      if (!address || !allowed.includes(address)) {
        throw new AgentError('UNAUTHORIZED', 'Unauthorized order update', 'orders-agent');
      }
    }
  }

  async add(order: Order): Promise<void> {
    const normalized = normalizeMessage<Order>('Order', order);
    await this.ensureAuthorized(normalized);
    const storeId = normalized.items?.[0]?.product?.storeId || '';
    const itemsHash = normalized.itemsHash
      ? normalized.itemsHash
      : Buffer.from(
          sha256(Buffer.from(canonicalJson(normalized.items))),
        ).toString('hex');
    let enriched: Order = { ...normalized, itemsHash };
    if (!normalized.paymentContractAddress || !normalized.paymentTxHash) {
      const { feeAddress, feeBps } = await getFeeSettings();
      const draft: DeployEscrowDraft = {
        sessionToken: normalized.sessionToken,
        scopes: ['checkout'],
        nonce: normalized.id,
        total: normalized.total,
        feeAddress,
        feeBps,
        buyerAddress: normalized.buyerAddress,
        sellerAddress: normalized.sellerAddress,
        kycReceiptHash: normalized.kycReceiptHash,
      };
      const { contractAddress, txHash } = await deployEscrow(draft);
      enriched = {
        ...enriched,
        paymentContractAddress: contractAddress,
        escrowAddr: contractAddress,
        paymentTxHash: txHash,
      };
    } else if (!normalized.escrowAddr && normalized.paymentContractAddress) {
      enriched = { ...enriched, escrowAddr: normalized.paymentContractAddress };
    }
    let toStore: any = { ...enriched };
    // ensure integrity of items by hashing their serialized form
    if (!toStore.itemsHash) {
      toStore.itemsHash = itemsHash;
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
      const normalizedStore = normalizeMessage<Order>('Order', toStore);
      await setOrder(sid, normalizedStore);
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
    const sid = enriched.items?.[0]?.product?.storeId || '';
    await notificationsAgent.handleOrderEvent('order.created', {
      orderId: enriched.id,
      userId: enriched.userId,
      storeId: sid,
    });
    await deliveryAgent.handleOrderEvent('order.created', {
      orderId: enriched.id,
      storeId: sid,
    });
  }

  async update(order: Order): Promise<void> {
    const normalized = normalizeMessage<Order>('Order', order);
    const current = await this.get(normalized.id);
    if (!current) {
      throw new AgentError('ORDER_NOT_FOUND', 'Order not found', 'orders-agent');
    }
    await this.ensureAuthorized(current);
    let statusChanged = false;
    if (normalized.status !== current.status) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[current.status] || [];
      if (!allowed.includes(normalized.status)) {
        throw new AgentError(
          'INVALID_STATUS_TRANSITION',
          `Invalid status transition from ${current.status} to ${normalized.status}`,
          'orders-agent',
        );
      }
      statusChanged = true;
    }
    {
      const sid = normalized.items?.[0]?.product?.storeId || '';
      this.storeMap.set(normalized.id, sid);
      this.knownStores.add(sid);
      await setOrder(sid, normalized);
      await this.subscribeStore(sid);
    }
    await logOrderEvent({
      tenant: normalized.items?.[0]?.product?.storeId || '',
      type: 'order.updated',
      payload: {
        orderId: normalized.id,
        prevStatus: current.status,
        newStatus: normalized.status,
      },
      actor: nearAuth.getAccountId() || '',
      timestamp: Date.now(),
    });
    const sid = normalized.items?.[0]?.product?.storeId || '';
    const publishPayload = {
      ...this.buildBaseEvent(normalized),
      prevStatus: current.status,
      newStatus: normalized.status,
    };
    const publishOptions = {
      orderId: normalized.id,
      orderNonce: normalized.updatedAt || new Date().toISOString(),
    } as const;
    await eventBus.publish(buildTopic('orders', sid), 'order.updated', publishPayload, publishOptions);
    await eventBus.publish(ORDER_TOPIC, 'order.updated', publishPayload, publishOptions);
    await eventBus.publish(NOTIFICATION_TOPIC, 'order.updated', publishPayload, publishOptions);
    this.subscribers.forEach((cb) => cb(normalized));
    if (statusChanged) {
      await notificationsAgent.handleOrderEvent('status.updated', {
        orderId: normalized.id,
        userId: normalized.userId,
        storeId: sid,
        status: normalized.status,
      });
      if (normalized.status === 'released') {
        if (sid) {
          void meteredBilling
            .recordUsage({
              tenantId: sid,
              meterId: 'orders.released',
              quantity: 1,
              unitPrice: normalized.total || 0,
              walletAddress: normalized.sellerAddress || undefined,
              metadata: {
                orderId: normalized.id,
                status: normalized.status,
              },
            })
            .catch((err) => errorLog('Failed to record billing usage', err));
        }
        await this.recordSellerMetric(normalized.sellerAddress, 'completed');
      } else if (normalized.status === 'refunded') {
        await this.recordSellerMetric(normalized.sellerAddress, 'refunded');
      }
      if (normalized.status === 'disputed' || current.status === 'disputed') {
        await eventBus.publish(buildTopic('orders', sid), 'dispute.updated', {
          ...this.buildBaseEvent(normalized),
          prevStatus: current.status,
          newStatus: normalized.status,
        });
        await notificationsAgent.handleOrderEvent('dispute.updated', {
          orderId: normalized.id,
          userId: normalized.userId,
          storeId: sid,
          status: normalized.status,
        });
      }
    }
  }

  async remove(id: string): Promise<void> {
    const order = await this.get(id);
    if (!order) {
      throw new AgentError('ORDER_NOT_FOUND', 'Order not found', 'orders-agent');
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
      throw new AgentError('ORDER_NOT_FOUND', 'Order not found', 'orders-agent');
    }
    await this.ensureAuthorized(order);
    if (!order.escrowAddr) {
      throw new AgentError('ESCROW_NOT_FOUND', 'Order escrow address not found', 'orders-agent');
    }
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes('released')) {
      throw new AgentError(
        'INVALID_STATUS_TRANSITION',
        `Invalid status transition from ${order.status} to released`,
        'orders-agent',
      );
    }
    const hash = await releasePayment(order.escrowAddr);
    const updated: Order = {
      ...order,
      status: 'released',
      updatedAt: new Date().toISOString(),
    };
    const normalized = normalizeMessage<Order>('Order', updated);
    {
      const sid = normalized.items?.[0]?.product?.storeId || '';
      this.storeMap.set(normalized.id, sid);
      this.knownStores.add(sid);
      await setOrder(sid, normalized);
      await this.subscribeStore(sid);
    }
    await logOrderEvent({
      tenant: normalized.items?.[0]?.product?.storeId || '',
      type: 'order.updated',
      payload: {
        orderId: normalized.id,
        prevStatus: order.status,
        newStatus: normalized.status,
      },
      actor: nearAuth.getAccountId() || '',
      timestamp: Date.now(),
    });
    const sid = normalized.items?.[0]?.product?.storeId || '';
    const publishPayload = {
      ...this.buildBaseEvent(normalized),
      prevStatus: order.status,
      newStatus: normalized.status,
    };
    const publishOptions = {
      orderId: normalized.id,
      orderNonce: normalized.updatedAt || new Date().toISOString(),
    } as const;
    await eventBus.publish(buildTopic('orders', sid), 'order.updated', publishPayload, publishOptions);
    await eventBus.publish(ORDER_TOPIC, 'order.updated', publishPayload, publishOptions);
    await eventBus.publish(NOTIFICATION_TOPIC, 'order.updated', publishPayload, publishOptions);
    await eventBus.publish(buildTopic('orders', sid), 'payment.received', {
      ...this.buildBaseEvent(normalized),
    });
    await Promise.all(
      order.items.map((item) =>
        productsAgent.decrementStock(
          item.productId,
          item.effectiveQty ?? item.quantity
        )
      )
    );
    this.subscribers.forEach((cb) => cb(normalized));
    await notificationsAgent.handleOrderEvent('status.updated', {
      orderId: normalized.id,
      userId: normalized.userId,
      storeId: sid,
      status: normalized.status,
    });
    await notificationsAgent.handleOrderEvent('payment.received', {
      orderId: normalized.id,
      userId: normalized.userId,
      storeId: sid,
    });
    await this.recordSellerMetric(order.sellerAddress, 'completed');
    return hash;
  }

  async refundPayment(orderId: string): Promise<string> {
    const order = await this.get(orderId);
    if (!order) {
      throw new AgentError('ORDER_NOT_FOUND', 'Order not found', 'orders-agent');
    }
    await this.ensureAuthorized(order);
    if (!order.escrowAddr) {
      throw new AgentError('ESCROW_NOT_FOUND', 'Order escrow address not found', 'orders-agent');
    }
    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes('refunded')) {
      throw new AgentError(
        'INVALID_STATUS_TRANSITION',
        `Invalid status transition from ${order.status} to refunded`,
        'orders-agent',
      );
    }
    const hash = await refundPayment(order.escrowAddr);
    const updated: Order = {
      ...order,
      status: 'refunded',
      updatedAt: new Date().toISOString(),
    };
    const normalized = normalizeMessage<Order>('Order', updated);
    {
      const sid = normalized.items?.[0]?.product?.storeId || '';
      this.storeMap.set(normalized.id, sid);
      this.knownStores.add(sid);
      await setOrder(sid, normalized);
      await this.subscribeStore(sid);
    }
    await logOrderEvent({
      tenant: normalized.items?.[0]?.product?.storeId || '',
      type: 'order.updated',
      payload: {
        orderId: normalized.id,
        prevStatus: order.status,
        newStatus: normalized.status,
      },
      actor: nearAuth.getAccountId() || '',
      timestamp: Date.now(),
    });
    const sid = normalized.items?.[0]?.product?.storeId || '';
    const publishPayload = {
      ...this.buildBaseEvent(normalized),
      prevStatus: order.status,
      newStatus: normalized.status,
    };
    const publishOptions = {
      orderId: normalized.id,
      orderNonce: normalized.updatedAt || new Date().toISOString(),
    } as const;
    await eventBus.publish(buildTopic('orders', sid), 'order.updated', publishPayload, publishOptions);
    await eventBus.publish(ORDER_TOPIC, 'order.updated', publishPayload, publishOptions);
    await eventBus.publish(NOTIFICATION_TOPIC, 'order.updated', publishPayload, publishOptions);
    this.subscribers.forEach((cb) => cb(normalized));
    await notificationsAgent.handleOrderEvent('status.updated', {
      orderId: normalized.id,
      userId: normalized.userId,
      storeId: sid,
      status: normalized.status,
    });
    await this.recordSellerMetric(order.sellerAddress, 'refunded');
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
