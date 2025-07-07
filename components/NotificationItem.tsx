import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Package, Tag, MessageCircle, Info, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { Notification } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface NotificationItemProps {
  notification: Notification;
  onPress: (id: string) => void;
}

export default function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const { colors } = useTheme();

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'order':
        return <Package size={24} color="#20B2AA" />;
      case 'promo':
        return <Tag size={24} color="#FF6B6B" />;
      case 'message':
        return <MessageCircle size={24} color="#4D96FF" />;
      case 'system':
      default:
        return <Info size={24} color="#FFB347" />;
    }
  };

  const getFormattedDate = () => {
    const date = new Date(notification.timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      // Today - show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        { 
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary 
        },
        !notification.read && {
          backgroundColor: '#F0FFFF',
          borderLeftColor: '#20B2AA'
        }
      ]}
      onPress={() => onPress(notification.id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.surface.secondary }]}>
        {getNotificationIcon()}
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: colors.text.primary }]}>{notification.title}</Text>
        <Text style={[styles.message, { color: colors.text.secondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={[styles.timestamp, { color: colors.text.tertiary }]}>{getFormattedDate()}</Text>
      </View>
      <View style={styles.statusContainer}>
        {notification.read ? (
          <CheckCircle size={20} color="#20B2AA" />
        ) : (
          <AlertCircle size={20} color="#FFB347" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)'
      }
    }),
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
  },
  statusContainer: {
    justifyContent: 'center',
    padding: 4,
  },
});
