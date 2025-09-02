import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Package, Tag, MessageCircle, Info, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { Notification } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, shadows } from '@/shared/ui/tokens';
import { typography } from '@/constants/styles';

interface NotificationItemProps {
  notification: Notification;
  onPress: (id: string) => void;
}

export default function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const { colors } = useTheme();

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'order':
        return <Package size={24} color={colors.status.success} />;
      case 'promo':
        return <Tag size={24} color={colors.status.error} />;
      case 'message':
        return <MessageCircle size={24} color={colors.status.info} />;
      case 'system':
      default:
        return <Info size={24} color={colors.status.warning} />;
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
          backgroundColor: colors.interactive.secondary,
          borderLeftColor: colors.status.success
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
          <CheckCircle size={20} color={colors.status.success} />
        ) : (
          <AlertCircle size={20} color={colors.status.warning} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: spacing.spacer16,
    marginBottom: spacing.spacer12,
    borderWidth: 1,
    borderLeftWidth: 4,
    ...Platform.select(shadows.sm),
  },
  iconContainer: {
    width: spacing.spacer40,
    height: spacing.spacer40,
    borderRadius: radius.full,
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
