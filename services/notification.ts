import { Notification } from '../types';
import { store } from '../lib/memoryStore';

class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async getNotifications(userId?: string): Promise<Notification[]> {
    if (!userId) return [];
    return store.notifications.get(userId) ?? [];
  }

  async markAsRead(id: string): Promise<boolean> {
    for (const list of store.notifications.values()) {
      const n = list.find((x) => x.id === id);
      if (n) {
        n.read = true;
        return true;
      }
    }
    return false;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    const list = store.notifications.get(userId);
    if (!list) return false;
    list.forEach((n) => (n.read = true));
    return true;
  }

  async deleteNotification(id: string): Promise<boolean> {
    for (const [uid, list] of store.notifications.entries()) {
      const idx = list.findIndex((n) => n.id === id);
      if (idx !== -1) {
        list.splice(idx, 1);
        store.notifications.set(uid, list);
        return true;
      }
    }
    return false;
  }

  async addNotification(notification: {
    userId: string;
    title: string;
    message: string;
    type: 'order' | 'promo' | 'message' | 'system';
  }): Promise<Notification | null> {
    const list = store.notifications.get(notification.userId) || [];
    const item: Notification = {
      id: `ntf_${Date.now()}`,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: false,
      timestamp: Date.now(),
    };
    list.unshift(item);
    store.notifications.set(notification.userId, list);
    return item;
  }

  async getUnreadCount(userId?: string): Promise<number> {
    if (!userId) return 0;
    const list = store.notifications.get(userId) || [];
    return list.filter((n) => !n.read).length;
  }

  subscribeToUserNotifications(_userId: string, _callback: (n: Notification) => void) {
    return null;
  }

  unsubscribeFromNotifications(_sub: any) {}
}

export default NotificationService;
