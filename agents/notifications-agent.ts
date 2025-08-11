import { Notification } from '../types';
import tonAuth from '../services/tonAuth';
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

type NotificationEvent =
  | 'order.created'
  | 'payment.received'
  | 'status.updated';

class NotificationsAgent {
  private subscribers: Set<(n: Notification) => void> = new Set();
  private node: LightNode | null = null;

  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to send notifications.');
    }
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
    await this.broadcastWaku(item);
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
      this.node = await createLightNode({ libp2p: { bootstrap } });
      await this.node.start();
      await waitForRemotePeer(this.node, [Protocols.Relay]);
      return this.node;
    } catch (err) {
      console.error('Failed to start Waku node', err);
      this.node = null;
      return null;
    }
  }

  private async broadcastWaku(item: Notification) {
    const node = await this.ensureNode();
    if (!node) return;
    try {
      const encoder = createEncoder({ contentTopic: ORDER_TOPIC });
      await node.lightPush.send(encoder, {
        payload: utf8ToBytes(JSON.stringify(item)),
      });
    } catch (err) {
      console.error('Failed to broadcast notification', err);
    }
  }
}

const DEFAULT_BOOTSTRAP =
  '/dns4/node.waku.nodes.status.im/tcp/443/wss/p2p/16Uiu2HAmSWvkpawuUxEe7dBDEu79SU1YEYTbSsfXrVvjJAnGqsRP';
const ORDER_TOPIC = '/congress/orders/1';

export default new NotificationsAgent();
