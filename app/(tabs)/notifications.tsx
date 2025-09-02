import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Bell, Package, Tag, MessageCircle, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Info } from 'lucide-react-native';
import { Notification } from '../../types';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import AppShell from '../../components/layout/AppShell';
import Spinner from '@/shared/ui/Spinner';
import EmptyState from '@/shared/ui/EmptyState';
import InfoModal from '../../components/InfoModal';
import { useAuthModal } from '@/features/auth/AuthModalContext';
import { useNotifications } from '../../src/features/notifications/hooks/useNotifications';



export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const { openAuthModal } = useAuthModal();
  const { isLoggedIn, isAdmin } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    if (error) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('notifications.loadError'),
        type: 'error',
      });
    }
  }, [error, t]);

  const handleMarkAllAsRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'כל ההתראות סומנו כנקראו',
        type: 'success',
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package size={24} color={colors.gold} />;
      case 'promo':
        return <Tag size={24} color="#FF6B6B" />;
      case 'message':
        return <MessageCircle size={24} color="#4D96FF" />;
      case 'system':
      default:
        return <Info size={24} color="#FFB347" />;
    }
  };

  const getFormattedDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return t('notifications.today');
    } else if (diffInDays === 1) {
      return t('notifications.yesterday');
    } else if (diffInDays < 7) {
      return t('notifications.daysAgo', { days: diffInDays });
    } else {
      return date.toLocaleDateString('he-IL');
    }
  };

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(notification => !notification.read);

  const renderNotification = (item: Notification) => (
    <TouchableOpacity 
      key={item.id}
      style={[
        styles.notificationItem,
        { 
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary 
        },
        !item.read && {
          backgroundColor: colors.interactive.secondary,
          borderLeftWidth: 4,
          borderLeftColor: colors.gold
        }
      ]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={[styles.notificationIcon, { backgroundColor: colors.surface.secondary }]}>
        {getNotificationIcon(item.type)}
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: colors.text.primary }]}>{item.title}</Text>
        <Text style={[styles.notificationMessage, { color: colors.text.secondary }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.notificationTime, { color: colors.text.tertiary }]}>
          {getFormattedDate(item.timestamp)}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.readIndicator}
        onPress={(e) => {
          e.stopPropagation();
          markAsRead(item.id);
        }}
      >
        {item.read ? (
          <CheckCircle size={20} color={colors.gold} />
        ) : (
          <AlertCircle size={20} color="#FFB347" />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const handleLogin = () => {
    openAuthModal();
  };

  return (
    <AppShell showSearch={false}>
      
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('notifications.notifications')}</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={[styles.markAllRead, { color: colors.gold }]}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isAdmin && (
        <View style={[styles.adminBanner, { backgroundColor: colors.gold }]}>
          <Bell size={20} color={colors.text.inverse} />
          <Text style={[styles.adminBannerText, { color: colors.text.inverse }]}>{t('notifications.adminNotifications')}</Text>
        </View>
      )}

      <View style={[styles.tabContainer, { backgroundColor: colors.surface.primary }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'all' && { backgroundColor: colors.gold }
          ]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[
            styles.tabText,
            { color: colors.text.primary },
            activeTab === 'all' && { color: colors.text.inverse }
          ]}>
            {t('notifications.all')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'unread' && { backgroundColor: colors.gold }
          ]}
          onPress={() => setActiveTab('unread')}
        >
          <Text style={[
            styles.tabText,
            { color: colors.text.primary },
            activeTab === 'unread' && { color: colors.text.inverse }
          ]}>
            {t('notifications.unread')}
          </Text>
          {notifications.filter(n => !n.read).length > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.status.error }]}>
              <Text style={[styles.unreadBadgeText, { color: colors.text.primary }]}>
                {notifications.filter(n => !n.read).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <Spinner label={t('notifications.loadingNotifications') as string} />
        </View>
      ) : !isLoggedIn ? (
        <EmptyState
          icon={Bell}
          title={t('auth.loginRequired') as string}
          message={t('auth.loginToView') as string}
          actionText={t('auth.login') as string}
          onAction={handleLogin}
        />
      ) : filteredNotifications.length > 0 ? (
        <ScrollView
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}
        >
          {filteredNotifications.map(renderNotification)}
        </ScrollView>
      ) : (
        <EmptyState
          icon={Bell}
          title={t('notifications.noNotifications') as string}
          message={(activeTab === 'all' ? t('notifications.noNotificationsYet') : t('notifications.noUnreadNotifications')) as string}
        />
      )}

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({...infoModal, visible: false})}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '500',
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  adminBannerText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  unreadBadge: {
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  notificationsList: {
    flex: 1,
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'end',
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
    textAlign: 'end',
  },
  notificationTime: {
    fontSize: 12,
    textAlign: 'end',
  },
  readIndicator: {
    justifyContent: 'center',
    padding: 4,
  },
  loginButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
