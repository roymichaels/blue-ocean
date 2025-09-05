import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import NotificationService from '@/services/notification';
import { useWaku } from '@/contexts/WakuContext';
import { parseNotificationWakuPayload } from '@/schemas/waku';
import { errorLog } from '@/utils/logger';

export function useNotificationSubscription(
  onNotification?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void,
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { isLoggedIn, user } = useAuth();
  const notificationSubscription = useRef<any>(null);
  const waku = useWaku();
  const wakuUnsub = useRef<(() => void) | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!isLoggedIn || !user) {
      setUnreadCount(0);
      return;
    }
    try {
      const notificationService = NotificationService.getInstance();
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      errorLog('Error refreshing notifications:', error);
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (isLoggedIn && user) {
      refreshNotifications();
      setupRealtimeSubscription();
      setupWakuSubscription();
    } else {
      setUnreadCount(0);
      cleanupSubscription();
      cleanupWakuSubscription();
    }
    return () => {
      cleanupSubscription();
      cleanupWakuSubscription();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user, refreshNotifications]);

  const setupRealtimeSubscription = () => {
    if (!user) return;
    const notificationService = NotificationService.getInstance();
    cleanupSubscription();
    notificationSubscription.current = notificationService.subscribeToUserNotifications(
      user.id,
      (notification) => {
        setUnreadCount((prev) => prev + 1);
        onNotification?.(
          notification.title,
          notification.message,
          notification.type === 'order'
            ? 'success'
            : notification.type === 'promo' || notification.type === 'message'
              ? 'info'
              : 'info',
        );
      },
    );
  };

  const cleanupSubscription = () => {
    if (notificationSubscription.current) {
      const notificationService = NotificationService.getInstance();
      notificationService.unsubscribeFromNotifications(notificationSubscription.current);
      notificationSubscription.current = null;
    }
  };

  const setupWakuSubscription = async () => {
    if (!user) return;
    if (wakuUnsub.current) {
      wakuUnsub.current();
      wakuUnsub.current = null;
    }
    wakuUnsub.current = await waku.subscribeOrders((message) => {
      try {
        const payload = parseNotificationWakuPayload(JSON.parse(message));
        if (!payload) return;
        const n = payload.notification;
        if (n.userId !== user.id) return;
        setUnreadCount((prev) => prev + 1);
        onNotification?.(
          n.title,
          n.message,
          n.type === 'order'
            ? 'success'
            : n.type === 'promo' || n.type === 'message'
              ? 'info'
              : 'info',
        );
      } catch (err) {
        errorLog('Failed to parse notification', err);
      }
    });
  };

  const cleanupWakuSubscription = () => {
    if (wakuUnsub.current) {
      wakuUnsub.current();
      wakuUnsub.current = null;
    }
  };

  return { unreadCount, refreshNotifications };
}

export type UseNotificationSubscriptionReturn = ReturnType<typeof useNotificationSubscription>;

