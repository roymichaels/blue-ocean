import { Notification } from '../types';
import { NotificationEvent } from '../types/waku';
import AgentError from '@/types/AgentError';
import { uuid } from '../utils/uuid';
import { assertNearChain } from '@/services/chain';
import {
  setNotification,
  getNotification,
  listNotifications,
  removeNotification,
} from '@/services/nearNotifications';
import { normalizeMessage } from '../lib/normalizeMessage';

assertNearChain();
import { getClient } from '@/utils/transport';
import { ensureNode, isWakuDisabled } from '@/services/waku';
import ensureNearWallet from '../utils/ensureNearWallet';
import { errorLog } from '../utils/logger';
import { buildTopic } from '../utils/wakuTopics';
import { canonicalJson } from '@/utils/serialization';
import {
  notificationsBacklog,
  notificationDeliveryLatency,
} from '../utils/observability';

export const E_BACKLOG = 'E_BACKLOG';

class NotificationsAgent {
  private subscribers: Set<(n: Notification) => void> = new Set();
  private backlog: Array<{
    event: NotificationEvent;
    item: Notification;
    storeId: string;
    queuedAt: number;
  }> = [];
  private draining = false;
  private backlogLimit = 50;

  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to send notifications.');
  }

  async add(item: Notification, storeId = '1'): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Notification>('Notification', item);
    await setNotification(normalized);
    this.subscribers.forEach((cb) => cb(normalized));
    await this.broadcastWaku(normalized, undefined, storeId);
  }

  async update(item: Notification, storeId = '1'): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Notification>('Notification', item);
    await setNotification(normalized);
    this.subscribers.forEach((cb) => cb(normalized));
    await this.broadcastWaku(normalized, undefined, storeId);
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    await removeNotification(id);
  }

  async get(id: string): Promise<Notification | null> {
    return await getNotification(id);
  }

  async getAll(): Promise<Notification[]> {
    return await listNotifications();
  }

  private enqueue(event: NotificationEvent, item: Notification, storeId: string) {
    if (this.backlog.length >= this.backlogLimit) {
      throw new AgentError(E_BACKLOG, 'Notification backlog limit exceeded', 'notifications-agent');
    }
    this.backlog.push({ event, item, storeId, queuedAt: Date.now() });
    notificationsBacklog.set(this.backlog.length);
    if (!this.draining) void this.drain();
  }

  private async drain() {
    if (this.draining) return;
    this.draining = true;
    while (this.backlog.length) {
      const job = this.backlog.shift()!;
      notificationsBacklog.set(this.backlog.length);
      const { event, item, storeId, queuedAt } = job;
      try {
        await this.broadcast(event, item, storeId);
        notificationDeliveryLatency.labels(event).observe((Date.now() - queuedAt) / 1000);
      } catch (err) {
        errorLog('Failed to process notification', err);
      }
    }
    this.draining = false;
  }

  handleOrderEvent(
    type:
      | 'order.created'
      | 'order.failed'
      | 'status.updated'
      | 'payment.received'
      | 'dispute.updated',
    payload: {
      orderId: string;
      userId: string;
      storeId?: string;
      status?: string;
    },
  ): void {
    let event: NotificationEvent;
    let title: string;
    let message: string;
    switch (type) {
      case 'order.created':
        event = 'notify.orderCreated';
        title = event;
        message = event;
        break;
      case 'order.failed':
        event = 'notify.orderFailed';
        title = event;
        message = event;
        break;
      case 'status.updated':
        event = 'status.updated';
        title = 'Order status updated';
        message = `Order ${payload.orderId} status changed to ${payload.status}`;
        break;
      case 'payment.received':
        event = 'payment.received';
        title = 'Payment received';
        message = `Payment for order ${payload.orderId} has been released`;
        break;
      case 'dispute.updated':
        event = 'dispute.updated';
        title = 'Order dispute updated';
        message = `Order ${payload.orderId} dispute status: ${payload.status}`;
        break;
    }
    const notification: Notification = {
      id: uuid(),
      userId: payload.userId,
      title,
      message,
      type: 'order',
      read: false,
      timestamp: Date.now(),
    };
    this.enqueue(event!, notification, payload.storeId || '1');
  }

  async broadcast(
    event: NotificationEvent,
    item: Notification,
    storeId = '1',
  ): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Notification>('Notification', item);
    await setNotification(normalized);
    this.subscribers.forEach((cb) => cb(normalized));
    // Broadcast the user-facing notification
    await this.broadcastWaku(normalized, undefined, storeId);
    // Broadcast the order event for other agents
    await this.broadcastWaku(normalized, event, storeId);
  }

  subscribe(cb: (n: Notification) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (n: Notification) => void) {
    this.subscribers.delete(cb);
  }

  async trackAnalytics(
    event: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    if (isWakuDisabled()) return;
    const node = await ensureNode();
    if (!node) return;
    try {
      const topic = buildTopic('analytics', '1');
      const client = await getClient();
      const encoder = client.createEncoder({ contentTopic: topic });
      await node.lightPush.send(encoder, {
        payload: client.utf8ToBytes(canonicalJson({ type: event, ...payload })),
      });
    } catch (err) {
      errorLog('Failed to broadcast analytics event', err);
    }
  }

  private async broadcastWaku(
    item: Notification,
    event?: NotificationEvent,
    storeId = '1',
  ) {
    const node = await ensureNode();
    if (!node) return;
    try {
      const domain = event ? 'orders' : 'notifications';
      const topic = buildTopic(domain, storeId);
      const client = await getClient();
      const encoder = client.createEncoder({ contentTopic: topic });
      const payload = event
        ? { type: event, notification: item }
        : item;
      await node.lightPush.send(encoder, {
        payload: client.utf8ToBytes(canonicalJson(payload)),
      });
    } catch (err) {
      errorLog('Failed to broadcast notification', err);
    }
  }
}

export default new NotificationsAgent();
