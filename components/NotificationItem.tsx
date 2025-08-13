import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Package, Tag, MessageCircle, Info, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { Notification } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, typography } from '../constants/styles';

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
    padding: spacing.spacer16,
    marginBottom: spacing.spacer12,
    borderWidth: 1,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { elevation: 2 },
      android: { elevation: 2 },
      web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)' }
    }),
  },
  iconContainer: {
    width: spacing.spacer40,
    height: spacing.spacer40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.spacer12,
  },
  contentContainer: {
    flex: 1,
    marginRight: spacing.spacer8,
  },
  title: {
    ...typography.bodyText,
    fontWeight: '600',
    marginBottom: spacing.spacer4,
  },
  message: {
    fontSize: 14,
    marginBottom: spacing.spacer8,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
  },
  statusContainer: {
    justifyContent: 'center',
    padding: spacing.spacer4,
  },
});
