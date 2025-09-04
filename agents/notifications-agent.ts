import { Notification } from '../types';
import { NotificationEvent } from '../types/waku';
import { assertNearChain } from '@/services/chain';
import {
  setNotification,
  getNotification,
  listNotifications,
  removeNotification,
} from '@/services/nearNotifications';
import { normalizeMessage } from '../lib/normalizeMessage';

assertNearChain();
import { createEncoder, utf8ToBytes } from '@waku/sdk';
import { ensureNode, isWakuDisabled } from '@/services/waku';
import ensureNearWallet from '../utils/ensureNearWallet';
import { errorLog } from '../utils/logger';
import { buildTopic } from '../utils/wakuTopics';

class NotificationsAgent {
  private subscribers: Set<(n: Notification) => void> = new Set();

  private async ensureWallet() {
    await ensureNearWallet('Please connect your NEAR wallet to send notifications.');
  }

  async add(item: Notification, storeId = 'default'): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Notification>('Notification', item);
    await setNotification(normalized);
    this.subscribers.forEach((cb) => cb(normalized));
    await this.broadcastWaku(normalized, undefined, storeId);
  }

  async update(item: Notification, storeId = 'default'): Promise<void> {
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

  async broadcast(
    event: NotificationEvent,
    item: Notification,
    storeId: string,
  ): Promise<void> {
    await this.ensureWallet();
    const normalized = normalizeMessage<Notification>('Notification', item);
    await setNotification(normalized);
    this.subscribers.forEach((cb) => cb(normalized));
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
      const encoder = createEncoder({ contentTopic: topic });
      await node.lightPush.send(encoder, {
        payload: utf8ToBytes(JSON.stringify({ type: event, ...payload })),
      });
    } catch (err) {
      errorLog('Failed to broadcast analytics event', err);
    }
  }

  private async broadcastWaku(
    item: Notification,
    event?: NotificationEvent,
    storeId = 'default',
  ) {
    const node = await ensureNode();
    if (!node) return;
    try {
      const topic = buildTopic('orders', storeId);
      const encoder = createEncoder({ contentTopic: topic });
      const payload = event
        ? { type: event, notification: item }
        : item;
      await node.lightPush.send(encoder, {
        payload: utf8ToBytes(JSON.stringify(payload)),
      });
    } catch (err) {
      errorLog('Failed to broadcast notification', err);
    }
  }
}

export default new NotificationsAgent();
