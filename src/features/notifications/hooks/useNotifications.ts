import { useState, useEffect, useCallback } from 'react';
import NotificationService from '@/services/notification';
import { Notification } from '@/types';
import { useAuth } from '@/components/AuthContext';

export function useNotifications() {
  const { isLoggedIn, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const notificationService = NotificationService.getInstance();
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      const service = NotificationService.getInstance();
      const success = await service.markAsRead(id);
      if (success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
      }
      return success;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const service = NotificationService.getInstance();
      const success = await service.markAllAsRead(user.id);
      if (success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
      return success;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, [user]);

  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    try {
      const service = NotificationService.getInstance();
      const success = await service.deleteNotification(id);
      if (success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
      return success;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && user) {
      void loadNotifications();
    } else {
      setLoading(false);
      setNotifications([]);
    }
  }, [isLoggedIn, user, loadNotifications]);

  return {
    notifications,
    loading,
    error,
    reload: loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

export type UseNotificationsReturn = ReturnType<typeof useNotifications>;
