import React, { useState } from 'react';
import { User, LogOut } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage } from '@/ui/ThemeProvider';
import { useTheme } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services';
import { useAuthModal } from '@/features/auth/AuthModalContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Menu, Avatar, type MenuItem } from '@/ui';

export default function UserAvatar() {
  const { isLoggedIn, user, logout } = useAuth();
  const { t } = useLanguage();
  const { getColor } = useTheme();
  const { openAuthModal } = useAuthModal();
  const { push, replace } = useAppRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const getInitials = () => {
    if (!user?.displayName && !user?.username) return 'G';
    const name = user?.displayName || user?.username || '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = () => {
    const palette = getColor(`avatarPalette`) as string[];
    const initials = getInitials();
    const index = initials.charCodeAt(0) % palette.length;
    return palette[index];
  };

  const handleProfile = () => {
    setMenuOpen(false);
    push('/profile');
  };

  const handleLogin = () => {
    setMenuOpen(false);
    openAuthModal();
  };

  const handleLogout = () => {
    setMenuOpen(false);
    setLogoutConfirmVisible(true);
  };

  const confirmLogout = async () => {
    await logout();
    replace('/');
    setLogoutConfirmVisible(false);
  };

  const items: MenuItem[] = isLoggedIn
    ? [
        {
          label: t('profile.profile'),
          icon: <User size={20} color={getColor('text.primary')} />,
          onPress: handleProfile,
        },
        {
          label: t('auth.logout'),
          icon: <LogOut size={20} color={getColor('status.error')} />,
          onPress: handleLogout,
          destructive: true,
        },
      ]
    : [
        {
          label: t('auth.login'),
          icon: <User size={20} color={getColor('text.primary')} />,
          onPress: handleLogin,
        },
      ];

  return (
    <>
      <Menu
        trigger={
          <Avatar
            size={36}
            uri={user?.avatar}
            initials={getInitials()}
            onPress={() =>
              isLoggedIn ? setMenuOpen((prev) => !prev) : handleLogin()
            }
            style={{
              borderColor: getColor('border.primary'),
              backgroundColor: isLoggedIn
                ? getRandomColor()
                : getColor('background.secondary'),
              borderWidth: 2,
            }}
            testID="avatar"
          />
        }
        open={menuOpen}
        onOpenChange={setMenuOpen}
        items={items}
      />
      <ConfirmationModal
        visible={logoutConfirmVisible}
        title={t('auth.logout')}
        message={t('auth.logoutConfirm')}
        confirmText={t('auth.logout')}
        cancelText={t('common.cancel')}
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmVisible(false)}
        destructive
      />
    </>
  );
}
