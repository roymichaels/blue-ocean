import { Notification } from '../types';
import { NotificationEvent } from '../types/waku';
import { assertNearChain } from '../services/chain';
import {
  setNotification,
  getNotification,
  listNotifications,
  removeNotification,
} from '../services/nearNotifications';
import { normalizeMessage } from '../lib/normalizeMessage';

assertNearChain();
import {
  LightNode,
  createLightNode,
  waitForRemotePeer,
  createEncoder,
  Protocols,
  utf8ToBytes,
} from '@waku/sdk';
import { getWakuBootstrapNodes } from '../utils/appConfig';
import ensureNearWallet from '../utils/ensureNearWallet';
import { errorLog } from '../utils/logger';
import { buildTopic } from '../utils/wakuTopics';

class NotificationsAgent {
  private subscribers: Set<(n: Notification) => void> = new Set();
  private node: LightNode | null = null;

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

  private async ensureNode(): Promise<LightNode | null> {
    if (this.node) return this.node;
    try {
      const bootstrap = getWakuBootstrapNodes();
      if (bootstrap.length === 0) {
        throw new Error('No Waku bootstrap nodes configured');
      }
      this.node = await createLightNode({ libp2p: { bootstrap } } as any);
      await this.node.start();
      await waitForRemotePeer(this.node, [Protocols.Relay]);
      return this.node;
    } catch (err) {
      errorLog('Failed to start Waku node', err);
      this.node = null;
      return null;
    }
  }

  private async broadcastWaku(
    item: Notification,
    event?: NotificationEvent,
    storeId = 'default',
  ) {
    const node = await this.ensureNode();
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
