import { debugLog, errorLog } from '@/utils/logger';
import { randomUUID } from 'crypto';
import { Notification } from '../types';
import notificationsAgent, { NotificationEvent } from '../agents/notifications-agent';

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
    try {
      if (!userId) {
        debugLog('No user ID provided for getNotifications');
        return [];
      }
      const list = await notificationsAgent.getAll();
      return list
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.timestamp - a.timestamp);
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
  }): Promise<Notification | null> {
    try {
      const newNotification: Notification = {
        id: randomUUID(),
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        timestamp: Date.now(),
      };
      await notificationsAgent.add(newNotification);
      return newNotification;
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
      if (n.userId === userId) callback(n);
    };
    notificationsAgent.subscribe(handler);
    return handler;
  }

  // Unsubscribe from real-time notifications
  unsubscribeFromNotifications(subscription: any) {
    notificationsAgent.unsubscribe(subscription);
  }
}

export default NotificationService;

export { NotificationEvent };
