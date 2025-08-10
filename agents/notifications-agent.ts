import { Notification } from '../types';
import { sendWakuNotificationUpdate } from '../lib/waku/sendWakuNotificationUpdate';
import WakuAgent from '../utils/wakuAgent';
import tonAuth from '../services/tonAuth';

class NotificationsAgent extends WakuAgent<Notification> {
  private subscribers: Set<(n: Notification) => void> = new Set();

  constructor() {
    super(sendWakuNotificationUpdate, {
      topic: '/congress/notifications/1',
      replayHistory: true,
      extractItem: (msg: any) => msg.notification as Notification,
      onUpdate: (item: Notification) => {
        this.subscribers.forEach((cb) => cb(item));
      },
    });
  }

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
    await super.add(item);
  }

  async update(item: Notification): Promise<void> {
    await this.ensureWallet();
    await super.update(item);
  }

  subscribe(cb: (n: Notification) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (n: Notification) => void) {
    this.subscribers.delete(cb);
  }
}

export default new NotificationsAgent();
