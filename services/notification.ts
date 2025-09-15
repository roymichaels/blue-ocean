// @ts-nocheck
import { debugLog, errorLog } from '@/utils/logger';
import { uuid } from '../utils/uuid';
import { Notification } from '../types';
import notificationsAgent from '../agents/notifications-agent';
import type { NotificationEvent } from '../types/waku';
import { t } from '@/i18n';
import eventBus from '@/services/eventBus';

class NotificationService {
  private static instance: NotificationService;

  private lastOpenedNotificationId: string | null = null;

  private constructor() {}

  private localize(n: Notification): Notification {
    return { ...n, title: t(n.title), message: t(n.message) };
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async getNotifications(userId?: string): Promise<Notification[]> {
    try {
      if (!userId) {
        debugLog('No user ID provided for getNotifications');
        return [];
      }
      const list = await notificationsAgent.getAll();
      return list
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((n) => this.localize(n));
    } catch (error) {
      errorLog('Error in getNotifications:', error);
      return [];
    }
  }

  async markAsRead(id: string): Promise<boolean> {
    try {
      const n = await notificationsAgent.get(id);
      if (!n) return false;
      n.read = true;
      await notificationsAgent.update(n);
      return true;
    } catch (error) {
      errorLog('Error in markAsRead:', error);
      return false;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const list = (await notificationsAgent.getAll()).filter(
        (n) => n.userId === userId && !n.read,
      );
      for (const n of list) {
        n.read = true;
        await notificationsAgent.update(n);
      }
      return true;
    } catch (error) {
      errorLog('Error in markAllAsRead:', error);
      return false;
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    try {
      await notificationsAgent.remove(id);
      return true;
    } catch (error) {
      errorLog('Error in deleteNotification:', error);
      return false;
    }
  }

  async addNotification(notification: {
    userId: string;
    title: string;
    message: string;
    type: 'order' | 'promo' | 'message' | 'system';
    link?: string;
  }): Promise<Notification | null> {
    try {
      const newNotification: Notification = {
        id: uuid(),
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        read: false,
        timestamp: Date.now(),
      };
      await notificationsAgent.add(newNotification);
      return this.localize(newNotification);
    } catch (error) {
      errorLog('Error in addNotification:', error);
      return null;
    }
  }

  async getUnreadCount(userId?: string): Promise<number> {
    try {
      if (!userId) {
        debugLog('No user ID provided for getUnreadCount');
        return 0;
      }
      return (await notificationsAgent.getAll()).filter(
        (n) => n.userId === userId && !n.read,
      ).length;
    } catch (error) {
      errorLog('Error in getUnreadCount:', error);
      return 0;
    }
  }

  // Subscribe to real-time notifications for a specific user
  subscribeToUserNotifications(userId: string, callback: (n: Notification) => void) {
    const handler = (n: Notification) => {
      if (n.userId === userId) {
        eventBus.track('notification.delivered', {
          notificationId: n.id,
          userId: n.userId,
          type: n.type,
          link: n.link,
        });
        callback(this.localize(n));
      }
    };
    notificationsAgent.subscribe(handler);
    return handler;
  }

  // Unsubscribe from real-time notifications
  unsubscribeFromNotifications(subscription: any) {
    notificationsAgent.unsubscribe(subscription);
  }

  setLastOpenedNotificationId(id: string) {
    this.lastOpenedNotificationId = id;
  }

  getLastOpenedNotificationId(): string | null {
    return this.lastOpenedNotificationId;
  }
}

export default NotificationService;
export type { NotificationEvent };
