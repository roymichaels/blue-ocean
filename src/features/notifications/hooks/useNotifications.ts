import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NotificationService from '@/services/notification';
import { Notification } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';

export function useNotifications() {
  const { isLoggedIn, user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  const { data: notifications = [], isFetching, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const notificationService = NotificationService.getInstance();
      return user ? notificationService.getNotifications(user.id) : [];
    },
    enabled: isLoggedIn && !!user,
    suspense: true,
    initialData: [],
  });

  const markAsRead = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const service = NotificationService.getInstance();
        const success = await service.markAsRead(id);
        if (success) {
          queryClient.setQueryData<Notification[]>(['notifications', user?.id], (prev = []) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
          );
        }
        return success;
      } catch (err) {
        setError(err as Error);
        return false;
      }
    },
    [queryClient, user?.id],
  );

  const markAllAsRead = useCallback(
    async (): Promise<boolean> => {
      if (!user) return false;
      try {
        const service = NotificationService.getInstance();
        const success = await service.markAllAsRead(user.id);
        if (success) {
          queryClient.setQueryData<Notification[]>(['notifications', user.id], (prev = []) =>
            prev.map((n) => ({ ...n, read: true })),
          );
        }
        return success;
      } catch (err) {
        setError(err as Error);
        return false;
      }
    },
    [queryClient, user],
  );

  const deleteNotification = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const service = NotificationService.getInstance();
        const success = await service.deleteNotification(id);
        if (success) {
          queryClient.setQueryData<Notification[]>(['notifications', user?.id], (prev = []) =>
            prev.filter((n) => n.id !== id),
          );
        }
        return success;
      } catch (err) {
        setError(err as Error);
        return false;
      }
    },
    [queryClient, user?.id],
  );

  return {
    notifications,
    loading: isFetching,
    error,
    reload: refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

export type UseNotificationsReturn = ReturnType<typeof useNotifications>;
