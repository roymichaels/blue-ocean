import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import NotificationService from '@/services/notification';
import { useWaku } from '@/contexts/WakuContext';
import { parseNotificationWakuPayload } from '@/schemas/waku';
import { errorLog } from '@/utils/logger';
import eventBus from '@/services/eventBus';

export function useNotificationSubscription(
  onNotification?: (
    title: string,
    message: string,
    type?: 'success' | 'info' | 'warning' | 'error',
    link?: string,
    id?: string,
  ) => void,
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
      const list = await notificationService.getNotifications(user.id);
      const unread = list.filter((n) => !n.read);
      setUnreadCount(unread.length);
      if (unread.length) {
        eventBus.track('notification.user_return', {
          userId: user.id,
          notificationIds: unread.map((n) => n.id),
        });
      }
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
          notification.link,
          notification.id,
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
        eventBus.track('notification.delivered', {
          notificationId: n.id,
          userId: n.userId,
          type: n.type,
          link: n.link,
        });
        setUnreadCount((prev) => prev + 1);
        onNotification?.(
          n.title,
          n.message,
          n.type === 'order'
            ? 'success'
            : n.type === 'promo' || n.type === 'message'
              ? 'info'
              : 'info',
          n.link,
          n.id,
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

