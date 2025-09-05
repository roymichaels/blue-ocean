import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import NotificationPopup from './NotificationPopup';
import AgentError from '@/types/AgentError';
import { useNotificationSubscription } from '@/features/notifications/hooks/useNotificationSubscription';

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

  const showAgentError = useCallback(
    (error: AgentError) => {
      setActiveNotification({
        title: error.source,
        message: `[${error.code}] ${error.message}`,
        type: 'error',
      });
    },
    [],
  );

  const { unreadCount, refreshNotifications } = useNotificationSubscription(showNotification);

  const handleClose = () => setActiveNotification(null);

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
          />
        )}
      </NotificationStateContext.Provider>
    </NotificationActionsContext.Provider>
  );
}

export type UseNotificationsReturn = ReturnType<typeof useNotifications>;
