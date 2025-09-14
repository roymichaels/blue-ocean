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
import { getClient } from '@/utils/transport';
import { ensureNode, isWakuDisabled } from '@/services/waku';
import ensureNearWallet from '../utils/ensureNearWallet';
import { errorLog } from '../utils/logger';
import { buildTopic } from '../utils/wakuTopics';
import { canonicalJson } from '@/utils/serialization';

class NotificationsAgent {
  private subscribers: Set<(n: Notification) => void> = new Set();

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
