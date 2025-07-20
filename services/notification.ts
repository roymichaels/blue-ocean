import { Notification } from '../types';
import { executeSql } from '../lib/sqlite';

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
        console.warn('No user ID provided for getNotifications');
        return [];
      }
      const result = await executeSql(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC',
        [userId],
      );
      const rows = (result.rows as any)._array || [];
      return rows.map((notification: any) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read,
        timestamp: notification.timestamp,
      }));
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  async markAsRead(id: string): Promise<boolean> {
    try {
      await executeSql('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await executeSql('UPDATE notifications SET read = 1 WHERE user_id = ?', [userId]);
      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    try {
      await executeSql('DELETE FROM notifications WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
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
      const newNotification = {
        user_id: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        timestamp: Date.now(),
      };

      const id = `ntf_${Date.now()}`;
      await executeSql(
        `INSERT INTO notifications (id, user_id, title, message, type, read, timestamp)
         VALUES (?,?,?,?,?,?,?)`,
        [
          id,
          newNotification.user_id,
          newNotification.title,
          newNotification.message,
          newNotification.type,
          0,
          newNotification.timestamp,
        ],
      );

      return {
        id,
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        read: false,
        timestamp: newNotification.timestamp,
      };
    } catch (error) {
      console.error('Error in addNotification:', error);
      return null;
    }
  }

  async getUnreadCount(userId?: string): Promise<number> {
    try {
      if (!userId) {
        // Handle the case where userId is undefined
        console.warn('No user ID provided for getUnreadCount');
        return 0;
      }

      const result = await executeSql(
        'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND read = 0',
        [userId],
      );
      const item = (result.rows as any)._array?.[0];
      return item ? item.cnt : 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  // Subscribe to real-time notifications for a specific user
  subscribeToUserNotifications(_userId: string, _callback: (n: Notification) => void) {
    console.warn('Realtime notifications not implemented with SQLite');
    return null;
  }

  // Unsubscribe from real-time notifications
  unsubscribeFromNotifications(_subscription: any) {
    // no-op
  }
}

export default NotificationService;
