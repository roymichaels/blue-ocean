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

  const cleanupSubscription = useCallback(() => {
    if (notificationSubscription.current) {
      const notificationService = NotificationService.getInstance();
      notificationService.unsubscribeFromNotifications(notificationSubscription.current);
      notificationSubscription.current = null;
    }
  }, []);

  const setupRealtimeSubscription = useCallback(() => {
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
  }, [cleanupSubscription, onNotification, user]);

  const cleanupWakuSubscription = useCallback(() => {
    if (wakuUnsub.current) {
      wakuUnsub.current();
      wakuUnsub.current = null;
    }
  }, []);

  const handleWakuNotification = useCallback(
    (message: string) => {
      if (!user) return;
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
    },
    [onNotification, user],
  );

  useEffect(() => {
    if (isLoggedIn && user) {
      void refreshNotifications();
      setupRealtimeSubscription();
    } else {
      setUnreadCount(0);
      cleanupSubscription();
      cleanupWakuSubscription();
    }
    return () => {
      cleanupSubscription();
      cleanupWakuSubscription();
    };
  }, [
    cleanupSubscription,
    cleanupWakuSubscription,
    isLoggedIn,
    refreshNotifications,
    setupRealtimeSubscription,
    user,
  ]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      return;
    }
    if (waku.status !== 'connected') {
      cleanupWakuSubscription();
      return;
    }
    let cancelled = false;
    (async () => {
      cleanupWakuSubscription();
      const unsub = await waku.subscribeNotifications((message) => {
        handleWakuNotification(message);
      });
      if (cancelled) {
        unsub();
        return;
      }
      wakuUnsub.current = unsub;
    })().catch((err) => {
      errorLog('Failed to subscribe to Waku notifications', err);
    });
    return () => {
      cancelled = true;
      cleanupWakuSubscription();
    };
  }, [
    cleanupWakuSubscription,
    handleWakuNotification,
    isLoggedIn,
    user,
    waku,
    waku.status,
  ]);

  return { unreadCount, refreshNotifications };
}

export type UseNotificationSubscriptionReturn = ReturnType<typeof useNotificationSubscription>;

