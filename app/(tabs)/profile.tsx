import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Settings,
  User,
  Shield,
  Moon,
  Sun,
  Globe,
  Bell,
  Truck,
  Package,
} from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import GlobalHeader from '../../components/GlobalHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../contexts/LanguageContext';
import InfoModal from '../../components/InfoModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import AuthTabsModal from '../../components/AuthTabsModal';

// Enable RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Storage keys for settings
const NOTIFICATIONS_STORAGE_KEY = 'settings_notifications';

export default function ProfileScreen() {
  const { isLoggedIn, isAdmin, isDriver, user, logout } = useAuth();
  const { t, currentLanguage, setLanguage } = useLanguage();
  const { theme, toggleTheme, colors } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  useEffect(() => {
    // Load saved settings
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notificationsSetting = await AsyncStorage.getItem(
        NOTIFICATIONS_STORAGE_KEY
      );

      if (notificationsSetting !== null) {
        setNotificationsEnabled(notificationsSetting === 'true');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, value.toString());
    } catch (error) {
      console.error('Error saving notifications setting:', error);
    }
  };

  const handleLogin = () => {
    router.push('/auth' as any);
  };

  const handleLogout = () => {
    setLogoutConfirmVisible(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      // Navigate to home page after logout
      router.replace('/');
      setInfoModal({
        visible: true,
        title: 'התנתקות',
        message: 'התנתקת בהצלחה',
        type: 'success',
      });
    } catch (error) {
      console.error('Logout error:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אירעה שגיאה בהתנתקות',
        type: 'error',
      });
    }
  };

  const handleLanguageSwitch = async () => {
    const newLanguage = currentLanguage === 'en' ? 'he' : 'en';
    await setLanguage(newLanguage);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <GlobalHeader showSearch={false} />

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View
          style={[
            styles.profileHeader,
            { borderBottomColor: colors.border.primary },
          ]}
        >
          <View style={[styles.avatarContainer, { borderColor: colors.gold }]}>
            <User size={40} color={colors.interactive.disabled} />
          </View>
          <Text style={[styles.userName, { color: colors.text.primary }]}>
            {isLoggedIn
              ? user?.displayName || user?.username
              : t('profile.guest')}
          </Text>
          <Text style={[styles.userEmail, { color: colors.text.secondary }]}>
            {isLoggedIn
              ? isAdmin
                ? t('profile.admin')
                : t('profile.customer')
              : t('profile.guestBrowsing')}
          </Text>
          {isAdmin && (
            <View style={[styles.adminBadge, { backgroundColor: colors.gold }]}>
              <Shield size={16} color={colors.text.inverse} />
              <Text
                style={[styles.adminBadgeText, { color: colors.text.inverse }]}
              >
                {t('profile.admin')}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats for logged in users */}
        {isLoggedIn && (
          <View
            style={[
              styles.statsContainer,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.gold }]}>
                {userOrders.length}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                הזמנות
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.gold }]}>8</Text>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                מועדפים
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.gold }]}>5</Text>
              <Text
                style={[styles.statLabel, { color: colors.text.secondary }]}
              >
                ביקורות
              </Text>
            </View>
          </View>
        )}

        {/* Admin Menu */}
        {isLoggedIn && isAdmin && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              ניהול
            </Text>
            <TouchableOpacity
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={() => router.push('/admin/dashboard' as any)}
            >
              <View style={styles.menuItemContent}>
                <Shield size={24} color={colors.gold} />
                <Text style={[styles.menuText, { color: colors.text.primary }]}>
                  לוח בקרה
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={() => router.push('/admin/deliveries' as any)}
            >
              <View style={styles.menuItemContent}>
                <Package size={24} color={colors.gold} />
                <Text style={[styles.menuText, { color: colors.text.primary }]}>
                  משלוחים
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Driver Menu */}
        {isLoggedIn && (isDriver || isAdmin) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              נהג
            </Text>
            <TouchableOpacity
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={() => router.push('/driver-dashboard' as any)}
            >
              <View style={styles.menuItemContent}>
                <Truck size={24} color={colors.gold} />
                <Text style={[styles.menuText, { color: colors.text.primary }]}>
                  לוח נהג
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Menu - Only show for logged in users */}
        {isLoggedIn && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              חשבון
            </Text>
            <TouchableOpacity
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
              onPress={() => router.push('/(tabs)/orders' as any)}
            >
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuText, { color: colors.text.primary }]}>
                  ההזמנות שלי
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            הגדרות
          </Text>

          <View
            style={[
              styles.menuItem,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <View style={styles.menuItemContent}>
              {theme === 'dark' ? (
                <Moon size={24} color={colors.gold} />
              ) : (
                <Sun size={24} color={colors.gold} />
              )}
              <Text style={[styles.menuText, { color: colors.text.primary }]}>
                {theme === 'dark' ? 'מצב כהה' : 'מצב בהיר'}
              </Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{
                false: colors.interactive.disabled,
                true: colors.gold,
              }}
              thumbColor={
                theme === 'dark' ? colors.text.inverse : colors.text.primary
              }
            />
          </View>

          {isLoggedIn && (
            <View
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
            >
              <View style={styles.menuItemContent}>
                <Bell size={24} color={colors.gold} />
                <Text style={[styles.menuText, { color: colors.text.primary }]}>
                  התראות פוש
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{
                  false: colors.interactive.disabled,
                  true: colors.gold,
                }}
                thumbColor={
                  notificationsEnabled
                    ? colors.text.inverse
                    : colors.text.primary
                }
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.menuItem,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
              },
            ]}
            onPress={handleLanguageSwitch}
          >
            <View style={styles.menuItemContent}>
              <Globe size={24} color={colors.gold} />
              <Text style={[styles.menuText, { color: colors.text.primary }]}>
                שפה
              </Text>
            </View>
            <View style={styles.languageContainer}>
              <Text
                style={[styles.languageText, { color: colors.text.secondary }]}
              >
                {currentLanguage === 'en'
                  ? t('profile.english')
                  : t('profile.hebrew')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Auth Actions */}
        <View style={styles.section}>
          {!isLoggedIn ? (
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.gold }]}
              onPress={handleLogin}
            >
              <Text
                style={[styles.authButtonText, { color: colors.text.inverse }]}
              >
                התחבר
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.authButton,
                styles.logoutButton,
                { backgroundColor: colors.status.error },
              ]}
              onPress={handleLogout}
            >
              <Text
                style={[styles.authButtonText, { color: colors.text.inverse }]}
              >
                התנתק
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: colors.text.tertiary }]}>
            גרסה 1.0.0
          </Text>
          <Text style={[styles.appCopyright, { color: colors.text.tertiary }]}>
            © 2024 הקונגרס הציוני
          </Text>
        </View>
      </ScrollView>

      {/* Auth Modal */}
      <AuthTabsModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab="login"
      />

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={logoutConfirmVisible}
        title="התנתקות"
        message="האם אתה בטוח שברצונך להתנתק?"
        confirmText="התנתק"
        cancelText="ביטול"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmVisible(false)}
        destructive={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    marginRight: 4,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  appVersion: {
    fontSize: 12,
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
  },
});
