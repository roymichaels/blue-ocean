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
import NotificationService from '../services/notification';
import { useAuth } from '../components/AuthContext';

export default function AdminNotificationBanner() {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const translateY = new Animated.Value(-60);
  const { user } = useAuth();

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
        { transform: [{ translateY }] }
      ]}
    >
      <View style={styles.content}>
        <Bell size={20} color="#FFFFFF" />
        <Text style={styles.message}>
          You have {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
        </Text>
        <TouchableOpacity style={styles.viewButton} onPress={handleViewAll}>
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={hideBanner}>
        <X size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#20B2AA',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  viewButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
