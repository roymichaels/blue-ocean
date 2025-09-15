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
import { publish, isWakuDisabled } from '@/services/waku';
import ensureNearWallet from '../utils/ensureNearWallet';
import { errorLog } from '../utils/logger';
import { buildTopic } from '../utils/wakuTopics';
import {
  notificationsBacklog,
  notificationDeliveryLatency,
} from '../utils/observability';
import { onBacklog } from '@/utils/wakuStore';
import {
  isNotificationsPipelineEnabled,
} from '@/config/featureFlags';

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
  private paused = false;
  private latencyLimit = 5000; // ms
  private delivered = new Set<string>();
  private pollTimer: NodeJS.Timeout | null = null;
  private pollInterval = 30000;

  constructor() {
    onBacklog(() => this.pause());
  }

  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to send notifications.');
  }

  async add(item: Notification, storeId = '1'): Promise<void> {
    if (this.paused || !isNotificationsPipelineEnabled(item.userId)) return;
    await this.ensureWallet();
    const normalized = normalizeMessage<Notification>('Notification', item);
    await setNotification(normalized);
    if (!this.delivered.has(normalized.id)) {
      this.delivered.add(normalized.id);
      this.subscribers.forEach((cb) => cb(normalized));
    }
    await this.broadcastWaku(normalized, undefined, storeId);
  }

  async update(item: Notification, storeId = '1'): Promise<void> {
    if (this.paused || !isNotificationsPipelineEnabled(item.userId)) return;
    await this.ensureWallet();
    const normalized = normalizeMessage<Notification>('Notification', item);
    await setNotification(normalized);
    if (!this.delivered.has(normalized.id)) {
      this.delivered.add(normalized.id);
      this.subscribers.forEach((cb) => cb(normalized));
    }
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
    if (this.paused || !isNotificationsPipelineEnabled(item.userId)) return;
    if (this.backlog.length >= this.backlogLimit) {
      this.pause();
      throw new AgentError(E_BACKLOG, 'Notification backlog limit exceeded', 'notifications-agent');
    }
    this.backlog.push({ event, item, storeId, queuedAt: Date.now() });
    notificationsBacklog.set(this.backlog.length);
    if (!this.draining) void this.drain();
  }

  private async drain() {
    if (this.draining || this.paused) return;
    this.draining = true;
    while (this.backlog.length && !this.paused) {
      const job = this.backlog.shift()!;
      notificationsBacklog.set(this.backlog.length);
      const { event, item, storeId, queuedAt } = job;
      try {
        await this.broadcast(event, item, storeId);
        const latency = Date.now() - queuedAt;
        notificationDeliveryLatency.labels(event).observe(latency / 1000);
        if (latency > this.latencyLimit) this.pause();
      } catch (err) {
        errorLog('Failed to process notification', err);
      }
    }
    this.draining = false;
  }

  private async poll(): Promise<void> {
    try {
      const items = await listNotifications();
      items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      let prev = 0;
      for (const n of items) {
        if (prev > (n.timestamp || 0)) {
          errorLog('Out-of-order notification', {
            prev,
            current: n.timestamp,
          });
        }
        prev = n.timestamp || 0;
        if (this.delivered.has(n.id)) continue;
        this.delivered.add(n.id);
        this.subscribers.forEach((cb) => cb(n));
      }
    } catch (err) {
      errorLog('Failed to poll notifications', err);
    }
  }

  private startPolling(): void {
    if (this.pollTimer) return;
    void this.poll();
    this.pollTimer = setInterval(() => void this.poll(), this.pollInterval);
  }

  private stopPolling(): void {
    if (!this.pollTimer) return;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
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
    if (this.paused || !isNotificationsPipelineEnabled(item.userId)) return;
    await this.ensureWallet();
    const normalized = normalizeMessage<Notification>('Notification', item);
    await setNotification(normalized);
    if (!this.delivered.has(normalized.id)) {
      this.delivered.add(normalized.id);
      this.subscribers.forEach((cb) => cb(normalized));
    }
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
    try {
      const topic = buildTopic('analytics', '1');
      await publish(topic, { type: event, ...payload });
    } catch (err) {
      errorLog('Failed to broadcast analytics event', err);
    }
  }

  private async broadcastWaku(
    item: Notification,
    event?: NotificationEvent,
    storeId = '1',
  ) {
    try {
      const domain = event ? 'orders' : 'notifications';
      const topic = buildTopic(domain, storeId);
      const payload = event ? { type: event, notification: item } : item;
      await publish(topic, payload);
    } catch (err) {
      errorLog('Failed to broadcast notification', err);
    }
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.startPolling();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.stopPolling();
    if (this.backlog.length && !this.draining) void this.drain();
  }

  isPaused(): boolean {
    return this.paused;
  }
}

export default new NotificationsAgent();
