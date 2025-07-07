import { Notification } from '../types';
import { supabase } from './supabase';

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

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return (data || []).map(notification => ({
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
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

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

      const { data, error } = await supabase
        .from('notifications')
        .insert([newNotification])
        .select()
        .single();

      if (error) {
        console.error('Error adding notification:', error);
        return null;
      }

      return {
        id: data.id,
        title: data.title,
        message: data.message,
        type: data.type,
        read: data.read,
        timestamp: data.timestamp,
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

      const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  // Subscribe to real-time notifications for a specific user
  subscribeToUserNotifications(userId: string, callback: (notification: Notification) => void) {
    if (!userId) {
      console.warn('No user ID provided for subscribeToUserNotifications');
      return null;
    }

    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id,
            title: payload.new.title,
            message: payload.new.message,
            type: payload.new.type,
            read: payload.new.read,
            timestamp: payload.new.timestamp,
          };
          callback(newNotification);
        }
      )
      .subscribe();

    return subscription;
  }

  // Unsubscribe from real-time notifications
  unsubscribeFromNotifications(subscription: any) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }
}

export default NotificationService;
