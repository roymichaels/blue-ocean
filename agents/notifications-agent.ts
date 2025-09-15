import { Notification } from '../types';
import type { NotificationEvent, NotificationWakuPayload, WakuMessage } from '../types/waku';
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
import { onBacklog, onDrained } from '@/utils/wakuStore';
import {
  isNotificationsPipelineEnabled,
} from '@/config/featureFlags';
import { canonicalJson } from '@/utils/serialization';
import { makeSignedWakuMessage } from '@/utils/wakuSigning';

export const E_BACKLOG = 'E_BACKLOG';

const NOTIFICATION_TOPIC = '/blue-ocean/notifications/1';
const MESSAGE_TYPE = 'notification.broadcast';
type PauseReason = 'queue' | 'latency' | 'waku';
type NotificationBroadcastPayload = NotificationWakuPayload & { storeId?: string };

class NotificationsAgent {
  private subscribers: Set<(n: Notification) => void> = new Set();
  private backlog: Array<{
    event: NotificationEvent;
    item: Notification;
    storeId: string;
    queuedAt: number;
    persisted: boolean;
  }> = [];
  private draining = false;
  private backlogLimit = 100;
  private latencyLimit = 1000; // ms
  private pauseReasons = new Set<PauseReason>();
  private delivered = new Set<string>();
  private pollTimer: NodeJS.Timeout | null = null;
  private pollInterval = 30000;
  private latencyTimer: NodeJS.Timeout | null = null;

  constructor() {
    onBacklog(() => this.pause('waku'));
    onDrained(() => this.resume('waku'));
  }

  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to send notifications.');
  }

  async add(item: Notification, storeId = '1'): Promise<void> {
    if (!isNotificationsPipelineEnabled(item.userId)) return;
    await this.ensureWallet();
    const normalized = normalizeMessage<Notification>('Notification', item);
    await setNotification(normalized);
    if (!this.delivered.has(normalized.id)) {
      this.delivered.add(normalized.id);
      this.subscribers.forEach((cb) => cb(normalized));
    }
    this.enqueue('notify.direct', normalized, storeId, { persisted: true });
  }

  async update(item: Notification, storeId = '1'): Promise<void> {
    if (!isNotificationsPipelineEnabled(item.userId)) return;
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

  private enqueue(
    event: NotificationEvent,
    item: Notification,
    storeId: string,
    options: { persisted?: boolean } = {},
  ) {
    if (!isNotificationsPipelineEnabled(item.userId)) return;
    if (this.backlog.length >= this.backlogLimit) {
      this.pause('queue');
      throw new AgentError(E_BACKLOG, 'Notification backlog limit exceeded', 'notifications-agent');
    }
    const persisted = options.persisted ?? false;
    this.backlog.push({ event, item, storeId, queuedAt: Date.now(), persisted });
    notificationsBacklog.set(this.backlog.length);
    if (!this.draining) void this.drain();
  }

  private async drain() {
    if (this.draining || this.shouldHaltProcessing()) return;
    this.draining = true;
    while (this.backlog.length) {
      if (this.shouldHaltProcessing()) break;
      const job = this.backlog.shift()!;
      notificationsBacklog.set(this.backlog.length);
      const { event, item, storeId, queuedAt, persisted } = job;
      try {
        await this.broadcast(event, item, storeId, { skipPersist: persisted });
        const latency = Date.now() - queuedAt;
        notificationDeliveryLatency.observe({ event }, latency);
        if (latency > this.latencyLimit) {
          this.pause('latency');
          break;
        }
        if (this.pauseReasons.has('queue') && this.backlog.length < this.backlogLimit) {
          this.resume('queue');
        }
      } catch (err) {
        errorLog('Failed to process notification', err);
      }
    }
    this.draining = false;
    if (!this.backlog.length) this.resume('queue');
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
      link: `/orders/${payload.orderId}`,
      read: false,
      timestamp: Date.now(),
    };
    this.enqueue(event!, notification, payload.storeId || '1');
  }

  async broadcast(
    event: NotificationEvent,
    item: Notification,
    storeId = '1',
    options: { skipPersist?: boolean } = {},
  ): Promise<void> {
    if (!isNotificationsPipelineEnabled(item.userId)) return;
    await this.ensureWallet();
    const normalized = normalizeMessage<Notification>('Notification', item);
    if (!options.skipPersist) {
      await setNotification(normalized);
    }
    if (!this.delivered.has(normalized.id)) {
      this.delivered.add(normalized.id);
      this.subscribers.forEach((cb) => cb(normalized));
    }
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
    if (isWakuDisabled()) return;
    try {
      const payload: NotificationBroadcastPayload = {
        type: event ?? 'notify.direct',
        notification: item,
        storeId,
      };
      const message = await makeSignedWakuMessage(
        MESSAGE_TYPE,
        canonicalJson(payload),
        'notifications',
      );
      await publish(NOTIFICATION_TOPIC, message);
    } catch (err) {
      errorLog('Failed to broadcast notification', err);
    }
  }

  pause(reason: PauseReason = 'queue'): void {
    const sizeBefore = this.pauseReasons.size;
    this.pauseReasons.add(reason);
    if (reason === 'latency') {
      if (this.latencyTimer) clearTimeout(this.latencyTimer);
      const delay = Math.max(this.latencyLimit, 0);
      const resumeDelay = delay === 0 ? 1 : delay;
      this.latencyTimer = setTimeout(() => {
        this.latencyTimer = null;
        this.resume('latency');
      }, resumeDelay);
    }
    if (this.pauseReasons.size > 0 && sizeBefore === 0) {
      this.startPolling();
    }
  }

  resume(reason: PauseReason = 'queue'): void {
    if (!this.pauseReasons.has(reason)) return;
    this.pauseReasons.delete(reason);
    if (reason === 'latency' && this.latencyTimer) {
      clearTimeout(this.latencyTimer);
      this.latencyTimer = null;
    }
    if (this.pauseReasons.size === 0) {
      this.stopPolling();
    }
    if (!this.shouldHaltProcessing() && this.backlog.length && !this.draining) {
      void this.drain();
    }
  }

  isPaused(): boolean {
    return this.pauseReasons.size > 0;
  }

  private shouldHaltProcessing(): boolean {
    return this.pauseReasons.has('waku') || this.pauseReasons.has('latency');
  }
}

export default new NotificationsAgent();
