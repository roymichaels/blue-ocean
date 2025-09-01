import { errorLog } from '@/utils/logger';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { User, LogOut, Settings, Shield, Globe, Moon, Sun } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { useAuthModal } from '@/features/auth/AuthModalContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import chain from '@/services/chain';

let listStores: (() => Promise<any[]>) | undefined;
if (chain === 'near') {
  ({ listStores } = require('@/features/stores/services/nearStores'));
}

const { width } = Dimensions.get('window');

export default function UserAvatar() {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const { isLoggedIn, isAdmin, user, logout } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const { theme, toggleTheme, getColor } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [storeId, setStoreId] = useState<string | null>(null);

  const getInitials = () => {
    if (!user?.displayName && !user?.username) return 'G';
    const name = user?.displayName || user?.username || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRandomColor = () => {
    const palette = getColor('avatarPalette') as string[];
    const initials = getInitials();
    const index = initials.charCodeAt(0) % palette.length;
    return palette[index];
  };

  const showDropdown = () => {
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }
    setDropdownVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const hideDropdown = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setDropdownVisible(false);
    });
  };

  const handleLogin = () => {
    hideDropdown();
    openAuthModal();
  };

  const handleLogout = () => {
    hideDropdown();
    setLogoutConfirmVisible(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      // Navigate to home page after logout
      router.replace('/');
    } catch (error) {
      errorLog('Logout error:', error);
    } finally {
      setLogoutConfirmVisible(false);
    }
  };

  useEffect(() => {
    const loadStore = async () => {
      if (!user?.address || !listStores) return;
      try {
        const stores = await listStores();
        const store = stores.find((s) => s.owner === user.address);
        if (store) setStoreId(store.id);
      } catch (err) {
        errorLog('Failed to load store for user', err);
      }
    };
    loadStore();
  }, [user?.address]);

  const handleAdminDashboard = () => {
    hideDropdown();
    if (storeId) {
      router.push(`/store/${storeId}/admin/dashboard`);
    }
  };

  const handleUserManagement = () => {
    hideDropdown();
    if (storeId) {
      router.push(`/store/${storeId}/admin/user-management`);
    }
  };

  const handleProfile = () => {
    hideDropdown();
    router.push('/(tabs)/profile');
  };

  const handleSettings = () => {
    hideDropdown();
    router.push('/(tabs)/profile');
  };

  const handleLanguageSwitch = async () => {
    const newLanguage = currentLanguage === 'en' ? 'he' : 'en';
    await setLanguage(newLanguage);
    hideDropdown();
  };

  const handleThemeToggle = async () => {
    await toggleTheme();
    hideDropdown();
  };

  return (
    <>
      <TouchableOpacity style={styles.avatarContainer} onPress={showDropdown}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: getRandomColor(), borderColor: getColor('adminBanner.buttonBackground') },
          ]}
        >
          <Text style={[styles.avatarText, { color: getColor('text.inverse') }]}>{getInitials()}</Text>
        </View>
        {isAdmin && (
          <View
            style={[
              styles.adminIndicator,
              { backgroundColor: getColor('gold'), borderColor: getColor('background') },
            ]}
          />
        )}
      </TouchableOpacity>

      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="none"
        onRequestClose={hideDropdown}
      >
        <TouchableOpacity 
          style={[
            styles.overlay,
            { backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)' }
          ]} 
          activeOpacity={1} 
          onPress={hideDropdown}
        >
          <Animated.View 
            style={[
              styles.dropdown,
              {
                backgroundColor: getColor('surface.elevated'),
                borderColor: getColor('border.primary'),
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            {/* User Info - Now Clickable */}
            <TouchableOpacity style={styles.userInfo} onPress={handleProfile}>
              <View style={[styles.dropdownAvatar, { backgroundColor: getRandomColor() }]}>
                <Text style={[styles.dropdownAvatarText, { color: getColor('text.inverse') }]}>
                  {getInitials()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: getColor('text.primary') }]}> 
                  {isLoggedIn ? user?.displayName || user?.username : t('profile.guest')}
                </Text>
                <Text style={[styles.userRole, { color: getColor('gold') }]}> 
                  {isLoggedIn ? (isAdmin ? t('profile.admin') : t('profile.customer')) : t('profile.guestBrowsing')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: getColor('border.primary') }]} />

            {/* Menu Items */}
            <View style={styles.menuItems}>
              {!isLoggedIn ? (
                <TouchableOpacity style={styles.menuItem} onPress={handleLogin}>
                  <Text style={[styles.menuText, { color: getColor('text.primary') }]}>{t('auth.login')}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  {isAdmin && (
                    <>
                      <TouchableOpacity style={styles.menuItem} onPress={handleAdminDashboard}>
                        <Shield size={20} color={getColor('gold')} />
                        <Text style={[styles.menuText, { color: getColor('text.primary') }]}>{t('profile.dashboard')}</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.menuItem} onPress={handleUserManagement}>
                        <User size={20} color={getColor('gold')} />
                        <Text style={[styles.menuText, { color: getColor('text.primary') }]}>ניהול משתמשים</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  
                  <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                    <Settings size={20} color={getColor('gold')} />
                    <Text style={[styles.menuText, { color: getColor('text.primary') }]}>{t('profile.settings')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Theme Switcher */}
              <TouchableOpacity style={styles.menuItem} onPress={handleThemeToggle}>
                {theme === 'dark' ? (
                  <>
                    <Sun size={20} color={getColor('gold')} />
                    <Text style={[styles.menuText, { color: getColor('text.primary') }]}>{t('profile.lightMode')}</Text>
                  </>
                ) : (
                  <>
                    <Moon size={20} color={getColor('gold')} />
                    <Text style={[styles.menuText, { color: getColor('text.primary') }]}>{t('profile.darkMode')}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Language Switcher */}
              <TouchableOpacity style={styles.menuItem} onPress={handleLanguageSwitch}>
                <Globe size={20} color={getColor('gold')} />
                <Text style={[styles.menuText, { color: getColor('text.primary') }]}>
                  {currentLanguage === 'en' ? t('profile.hebrew') : t('profile.english')}
                </Text>
              </TouchableOpacity>

              {isLoggedIn && (
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <LogOut size={20} color={getColor('status.error')} />
                  <Text style={[styles.menuText, { color: getColor('status.error') }]}>{t('auth.logout')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={logoutConfirmVisible}
        title={t('auth.logout')}
        message={t('auth.logoutConfirm')}
        confirmText={t('auth.logout')}
        cancelText={t('common.cancel')}
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmVisible(false)}
        destructive={true}
      />
    </>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  adminIndicator: {
    position: 'absolute',
    top: -2,
    end: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  dropdown: {
    borderRadius: 12,
    minWidth: 200,
    maxWidth: width - 32,
    borderWidth: 1,
    ...Platform.select({
      ios: { elevation: 8 },
      android: { elevation: 8 },
      web: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' }
    }),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dropdownAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'end',
  },
  userRole: {
    fontSize: 12,
    textAlign: 'end',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  menuItems: {
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuText: {
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '500',
    textAlign: 'end',
    flex: 1,
  },
});
