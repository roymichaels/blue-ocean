import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NotificationService from '../services/notification';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '@/features/auth/AuthContext';
import { spacing } from '../constants/tokens';

interface NotificationBadgeProps {
  size?: number;
  style?: any;
}

export default function NotificationBadge({ size = spacing.spacer20, style }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { colors } = useTheme();
  const { isLoggedIn, user } = useAuth();

  useEffect(() => {
    if (isLoggedIn && user) {
      loadUnreadCount();
      
      // Set up interval to periodically check for new notifications
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [isLoggedIn, user]);

  const loadUnreadCount = async () => {
    try {
      const notificationService = NotificationService.getInstance();
      // Always pass user.id, even if it might be undefined
      // The service will handle the undefined case gracefully
      const count = await notificationService.getUnreadCount(user?.id);
      setUnreadCount(count);
    } catch (error) {
      errorLog('Error loading unread count:', error);
    }
  };

  if (unreadCount === 0) {
    return null;
  }

  return (
    <View style={[
      styles.badge, 
      { 
        width: size, 
        height: size, 
        borderRadius: size / 2,
        backgroundColor: colors.status.error
      },
      style
    ]}>
      <Text style={[styles.badgeText, { 
        fontSize: size * 0.5,
        color: colors.text.primary
      }]}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -spacing.spacer4,
    end: -spacing.spacer4,
    minWidth: spacing.spacer20,
    paddingHorizontal: spacing.spacer4 / 2,
  },
  badgeText: {
    fontWeight: 'bold',
  },
});
