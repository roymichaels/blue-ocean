import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import NotificationService from '../services/notification';
import { Notification } from '../types';
import NotificationPopup from './NotificationPopup';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  showNotification: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  showNotification: () => {},
  refreshNotifications: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeNotification, setActiveNotification] = useState<{
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);
  const { isLoggedIn, user } = useAuth();
  const notificationSubscription = useRef<any>(null);

  useEffect(() => {
    if (isLoggedIn && user) {
      refreshNotifications();
      setupRealtimeSubscription();
    } else {
      setUnreadCount(0);
      cleanupSubscription();
    }
    
    return () => {
      cleanupSubscription();
    };
  }, [isLoggedIn, user]);

  const setupRealtimeSubscription = () => {
    if (!user) return;
    
    const notificationService = NotificationService.getInstance();
    
    // Clean up any existing subscription
    cleanupSubscription();
    
    // Set up new subscription
    notificationSubscription.current = notificationService.subscribeToUserNotifications(
      user.id,
      (notification) => {
        // Update unread count
        setUnreadCount(prev => prev + 1);
        
        // Show notification popup
        showNotification(
          notification.title,
          notification.message,
          notification.type === 'order' ? 'success' :
          notification.type === 'promo' ? 'info' :
          notification.type === 'message' ? 'info' :
          'info'
        );
      }
    );
  };

  const cleanupSubscription = () => {
    if (notificationSubscription.current) {
      const notificationService = NotificationService.getInstance();
      notificationService.unsubscribeFromNotifications(notificationSubscription.current);
      notificationSubscription.current = null;
    }
  };

  const refreshNotifications = async () => {
    if (!isLoggedIn || !user) {
      setUnreadCount(0);
      return;
    }
    
    try {
      const notificationService = NotificationService.getInstance();
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  };

  const showNotification = (
    title: string, 
    message: string, 
    type: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    setActiveNotification({ title, message, type });
  };

  const handleCloseNotification = () => {
    setActiveNotification(null);
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        unreadCount, 
        showNotification,
        refreshNotifications
      }}
    >
      {children}
      {activeNotification && (
        <NotificationPopup
          title={activeNotification.title}
          message={activeNotification.message}
          type={activeNotification.type}
          onClose={handleCloseNotification}
        />
      )}
    </NotificationContext.Provider>
  );
}
