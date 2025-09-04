import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing
} from 'react-native';
import { Bell, X } from 'lucide-react-native';
import NotificationService from '@/services/notification';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/ui/ThemeProvider';

export default function AdminNotificationBanner() {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const translateY = new Animated.Value(-60);
  const { user } = useAuth();
  const { getColor } = useTheme();

  useEffect(() => {
    if (!user) {
      return;
    }

    checkUnreadNotifications();

    // Check for new notifications periodically
    const interval = setInterval(checkUnreadNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const checkUnreadNotifications = async () => {
    if (!user) {
      return;
    }
    try {
      const notificationService = NotificationService.getInstance();
      const count = await notificationService.getUnreadCount(user?.id);
      
      setUnreadCount(count);
      
      if (count > 0 && !visible) {
        setVisible(true);
        showBanner();
      }
    } catch (error) {
      errorLog('Error checking notifications:', error);
    }
  };

  const showBanner = () => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideBanner = () => {
    Animated.timing(translateY, {
      toValue: -60,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  const handleViewAll = () => {
    hideBanner();
    // Navigate to notifications tab
    // In a real app, you would use navigation here
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: getColor('adminBanner.background'), transform: [{ translateY }] }
      ]}
    >
      <View style={styles.content}>
        <Bell size={20} color={getColor('adminBanner.text')} />
        <Text style={[styles.message, { color: getColor('adminBanner.text') }] }>
          You have {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
        </Text>
        <TouchableOpacity
          style={[styles.viewButton, { backgroundColor: getColor('adminBanner.buttonBackground') }]}
          onPress={handleViewAll}
        >
          <Text style={[styles.viewButtonText, { color: getColor('adminBanner.text') }]}>View</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={hideBanner}>
        <X size={16} color={getColor('adminBanner.text')} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
