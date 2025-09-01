import { errorLog } from '@/utils/logger';
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import NotificationService from '../services/notification';
import { Notification } from '../types';
import NotificationPopup from './NotificationPopup';
import { useAuth } from '@/features/auth/AuthContext';
import { useWaku } from '@/contexts/WakuContext';
import { parseNotificationWakuPayload } from '../schemas/waku';

interface NotificationState {
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
}

interface NotificationActions {
  showNotification: (
    title: string,
    message: string,
    type?: 'success' | 'info' | 'warning' | 'error',
  ) => void;
}

const NotificationStateContext = createContext<NotificationState>({
  unreadCount: 0,
  refreshNotifications: async () => {},
});

const NotificationActionsContext = createContext<NotificationActions>({
  showNotification: () => {},
});

export const useNotificationState = () => useContext(NotificationStateContext);
export const useNotificationActions = () => useContext(NotificationActionsContext);

export const useNotifications = () => {
  return { ...useNotificationState(), ...useNotificationActions() };
};

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  return (
    <NotificationPopupProvider>
      <NotificationCountProvider>{children}</NotificationCountProvider>
    </NotificationPopupProvider>
  );
}

function NotificationPopupProvider({ children }: { children: ReactNode }) {
  const [activeNotification, setActiveNotification] = useState<{
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);

  const showNotification = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'info' | 'warning' | 'error' = 'info',
    ) => {
      setActiveNotification({ title, message, type });
    },
    [],
  );

  const handleClose = () => setActiveNotification(null);

  return (
    <NotificationActionsContext.Provider value={{ showNotification }}>
      {children}
      {activeNotification && (
        <NotificationPopup
          title={activeNotification.title}
          message={activeNotification.message}
          type={activeNotification.type}
          onClose={handleClose}
        />
      )}
    </NotificationActionsContext.Provider>
  );
}

function NotificationCountProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { isLoggedIn, user } = useAuth();
  const notificationSubscription = useRef<any>(null);
  const waku = useWaku();
  const wakuUnsub = useRef<(() => void) | null>(null);
  const { showNotification } = useNotificationActions();

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
  }, [isLoggedIn, user, refreshNotifications]);

  const setupRealtimeSubscription = () => {
    if (!user) return;
    const notificationService = NotificationService.getInstance();
    cleanupSubscription();
    notificationSubscription.current = notificationService.subscribeToUserNotifications(
      user.id,
      (notification) => {
        setUnreadCount((prev) => prev + 1);
        showNotification(
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
        showNotification(
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

  return (
    <NotificationStateContext.Provider
      value={{ unreadCount, refreshNotifications }}
    >
      {children}
    </NotificationStateContext.Provider>
  );
}

