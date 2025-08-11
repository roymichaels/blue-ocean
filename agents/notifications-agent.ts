import { Notification } from '../types';
import tonAuth from '../services/tonAuth';
import {
  setNotification,
  getNotification,
  listNotifications,
  removeNotification,
} from '../services/tonNotifications';

class NotificationsAgent {
  private subscribers: Set<(n: Notification) => void> = new Set();

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
  }

  async update(item: Notification): Promise<void> {
    await this.ensureWallet();
    await setNotification(item);
    this.subscribers.forEach((cb) => cb(item));
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

  subscribe(cb: (n: Notification) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (n: Notification) => void) {
    this.subscribers.delete(cb);
  }
}

export default new NotificationsAgent();
