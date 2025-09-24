import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import NotificationPopup from './NotificationPopup';
import AgentError from '@/types/AgentError';
import { useNotificationSubscription } from '@/features/notifications';
import NotificationService from '@/services/notification';
import eventBus from '@/services/eventBus';
import { useAppRouter } from '@/hooks';
import { uuid } from '@/utils/uuid';

interface NotificationState {
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
}

interface NotificationActions {
  showNotification: (
    title: string,
    message: string,
    type?: 'success' | 'info' | 'warning' | 'error',
    link?: string,
    id?: string,
  ) => void;
  showAgentError: (error: AgentError) => void;
}

const NotificationStateContext = createContext<NotificationState>({
  unreadCount: 0,
  refreshNotifications: async () => {},
});

const NotificationActionsContext = createContext<NotificationActions>({
  showNotification: () => {},
  showAgentError: () => {},
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
  const [activeNotification, setActiveNotification] = useState<{
    id?: string;
    title: string;
    message: string;
    link?: string;
    type: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);

  const showNotification = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'info' | 'warning' | 'error' = 'info',
      link?: string,
      id?: string,
    ) => {
      setActiveNotification({ id, title, message, type, link });
    },
    [],
  );

  const showAgentError = useCallback(
    (error: AgentError) => {
      setActiveNotification({
        id: uuid(),
        title: error.source,
        message: `[${error.code}] ${error.message}`,
        type: 'error',
      });
    },
    [],
  );

  const { unreadCount, refreshNotifications } = useNotificationSubscription(showNotification);
  const { push } = useAppRouter();

  const handleClose = () => setActiveNotification(null);

  const handleNavigate = () => {
    if (!activeNotification) return;
    if (activeNotification.id) {
      NotificationService.getInstance().setLastOpenedNotificationId(activeNotification.id);
      eventBus.track('notification.opened', { notificationId: activeNotification.id });
    }
    if (activeNotification.link) {
      push(activeNotification.link);
    }
  };

  return (
    <NotificationActionsContext.Provider value={{ showNotification, showAgentError }}>
      <NotificationStateContext.Provider value={{ unreadCount, refreshNotifications }}>
        {children}
        {activeNotification && (
          <NotificationPopup
            title={activeNotification.title}
            message={activeNotification.message}
            type={activeNotification.type}
            onClose={handleClose}
            onPress={handleNavigate}
          />
        )}
      </NotificationStateContext.Provider>
    </NotificationActionsContext.Provider>
  );
}

export type UseNotificationsReturn = ReturnType<typeof useNotifications>;
