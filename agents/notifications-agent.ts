import { Notification } from '../types';
import {
  setNotification,
  getNotification,
  listNotifications,
  removeNotification,
} from '../services/tonNotifications';
import {
  LightNode,
  createLightNode,
  waitForRemotePeer,
  createEncoder,
  Protocols,
  utf8ToBytes,
} from '@waku/sdk';
import { getWakuBootstrapNodes } from '../utils/appConfig';
import ensureTonWallet from '../utils/ensureTonWallet';

const DEFAULT_BOOTSTRAP =
  '/dns4/node.waku.nodes.status.im/tcp/443/wss/p2p/16Uiu2HAmSWvkpawuUxEe7dBDEu79SU1YEYTbSsfXrVvjJAnGqsRP';
const ORDER_TOPIC = '/congress/orders/1';

export type NotificationEvent =
  | 'order.created'
  | 'payment.received'
  | 'status.updated'
  | 'dispute.updated'
  | 'escrow.deployed';

type NotificationTemplate = (
  item: Notification,
) => {
  contentTopic: string;
  payload: any;
};

export const notificationTemplates: Record<NotificationEvent, NotificationTemplate> = {
  'order.created': (item) => ({
    contentTopic: ORDER_TOPIC,
    payload: { type: 'order.created', notification: item },
  }),
  'payment.received': (item) => ({
    contentTopic: ORDER_TOPIC,
    payload: { type: 'payment.received', notification: item },
  }),
  'status.updated': (item) => ({
    contentTopic: ORDER_TOPIC,
    payload: { type: 'status.updated', notification: item },
  }),
  'dispute.updated': (item) => ({
    contentTopic: ORDER_TOPIC,
    payload: { type: 'dispute.updated', notification: item },
  }),
  'escrow.deployed': (item) => ({
    contentTopic: ORDER_TOPIC,
    payload: { type: 'escrow.deployed', notification: item },
  }),
};

class NotificationsAgent {
  private subscribers: Set<(n: Notification) => void> = new Set();
  private node: LightNode | null = null;

  private async ensureWallet() {
    await ensureTonWallet('Please connect your TON wallet to send notifications.');
  }

  async add(item: Notification): Promise<void> {
    await this.ensureWallet();
    await setNotification(item);
    this.subscribers.forEach((cb) => cb(item));
    await this.broadcastWaku(item);
  }

  async update(item: Notification): Promise<void> {
    await this.ensureWallet();
    await setNotification(item);
    this.subscribers.forEach((cb) => cb(item));
    await this.broadcastWaku(item);
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

  async broadcast(event: NotificationEvent, item: Notification): Promise<void> {
    await this.ensureWallet();
    await setNotification(item);
    this.subscribers.forEach((cb) => cb(item));
    await this.broadcastWaku(item, event);
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
      if (bootstrap.length === 0) bootstrap.push(DEFAULT_BOOTSTRAP);
      this.node = await createLightNode({ libp2p: { bootstrap } } as any);
      await this.node.start();
      await waitForRemotePeer(this.node, [Protocols.Relay]);
      return this.node;
    } catch (err) {
      console.error('Failed to start Waku node', err);
      this.node = null;
      return null;
    }
  }

  private async broadcastWaku(item: Notification, event?: NotificationEvent) {
    const node = await this.ensureNode();
    if (!node) return;
    try {
      if (event) {
        const template = notificationTemplates[event];
        if (!template) return;
        const { contentTopic, payload } = template(item);
        const encoder = createEncoder({ contentTopic });
        await node.lightPush.send(encoder, {
          payload: utf8ToBytes(JSON.stringify(payload)),
        });
      } else {
        const encoder = createEncoder({ contentTopic: ORDER_TOPIC });
        await node.lightPush.send(encoder, {
          payload: utf8ToBytes(JSON.stringify(item)),
        });
      }
    } catch (err) {
      console.error('Failed to broadcast notification', err);
    }
  }
}

export default new NotificationsAgent();
