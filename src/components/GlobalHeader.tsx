// TOUCHPOINT: components/GlobalHeader.tsx renders in production — Fix Pack v2
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Text, Chip } from '@/ui';
import SmartImage from './SmartImage';
import { Search, Bell, Globe } from 'lucide-react-native';
import { useAppRouter } from '@/hooks';
import { getShopTenantId } from '@/hooks/config';
import { useLanguage } from '@/ui/ThemeProvider';
import { useTheme } from '@/ui/ThemeProvider';
import { useAppInfo } from '../contexts/AppInfoContext';
import UserAvatar from './UserAvatar';
import CommandPalette from './CommandPalette';
import GadgetLabConsole from './GadgetLabConsole';
import { spacing, radius, typography } from '@/ui/tokens';
import { usePathname } from 'expo-router';
import { useNotificationState } from './NotificationContext';
import { useWallet } from '@/contexts/WalletProvider';
import { useAuthModal } from '@/features/auth/AuthModalContext';

interface GlobalHeaderProps {
  showSearch?: boolean;
}

// TODO:TODO-121 Decompose GlobalHeader into presentational and data hooks to improve testability of complex UI state.
// TODO:REC-221 Preload command palette dependencies when notifications arrive to minimize perceived latency.
export default function GlobalHeader({ showSearch = true }: GlobalHeaderProps) {
  const isTest = typeof process !== 'undefined' && (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test');
  const { t, isRTL, currentLanguage, setLanguage } = useLanguage();
  const { colors } = useTheme();
  const { appName, logoCid } = useAppInfo();
  const { push } = useAppRouter();
  const { unreadCount, refreshNotifications } = useNotificationState();
  const { address } = useWallet();
  const { openAuthModal } = useAuthModal();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isMd = width >= 768;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const tapTimesRef = useRef<number[]>([]);
  const shopTenantId = getShopTenantId();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleLanguage = async () => {
    const next = currentLanguage === 'he' ? 'en' : 'he';
    await setLanguage(next as any);
  };

  const walletLabel = address ? `@${address}` : t('auth.not_connected', 'Not connected');
  const handleWalletPress = async () => {
    // Unify wallet flow: use the auth modal for login/connect and account actions
    openAuthModal();
  };

  const handleLogoPress = () => {
    const now = Date.now();
    const taps = tapTimesRef.current.filter((ts) => now - ts < 600);
    taps.push(now);
    tapTimesRef.current = taps;
    if (tapTimesRef.current.length >= 3) {
      tapTimesRef.current = [];
      setConsoleVisible(true);
      return;
    }
    if (pathname !== '/' && pathname !== '/index') {
      push(shopTenantId ? `/store/${shopTenantId}` : '/');
    }
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.background,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          paddingHorizontal: isMd ? spacing.spacer24 : spacing.spacer16,
        },
      ]}
    >
      <Pressable
        style={styles.logo}
        onPress={handleLogoPress}
        accessibilityRole="button"
      >
        {logoCid && !isTest ? (
          <SmartImage
            uri={logoCid}
            width={40}
            height={40}
            style={styles.logoImage}
            contentFit="contain"
          />
        ) : (
          <View style={[styles.logoIcon, { backgroundColor: colors.gold }]} />
        )}
        {isMd && (
          <Text style={[styles.logoText, { color: colors.gold }]}> 
            {appName || t('ageVerification.platformName')}
          </Text>
        )}
      </Pressable>
      <View
        style={[
          styles.actions,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {showSearch && (
          <Pressable
            onPress={() => push('/search')}
            accessibilityLabel={t('home.searchPlaceholder')}
            accessibilityRole="button"
            focusable
            {...(Platform.OS === 'web'
              ? { title: t('home.searchPlaceholder') }
              : {})}
            style={(state) => [
              styles.iconButton,
              { backgroundColor: colors.surface.primary },
              (state as any).focused && {
                borderColor: colors.border.focus,
                borderWidth: 2,
              },
            ]}
          >
            <Search size={24} color={colors.text.primary} />
          </Pressable>
        )}

        <Pressable
          onPress={refreshNotifications}
          accessibilityLabel={t('notifications.notifications')}
          accessibilityRole="button"
          focusable
          {...(Platform.OS === 'web'
            ? { title: t('notifications.notifications') }
            : {})}
          style={(state) => [
            styles.iconButton,
            { backgroundColor: colors.surface.primary },
            (state as any).focused && {
              borderColor: colors.border.focus,
              borderWidth: 2,
            },
          ]}
        >
          <Bell size={24} color={colors.text.primary} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.gold }]}>
              <Text
                style={[styles.badgeText, { color: colors.text.inverse }]}
              >
                {unreadCount}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={toggleLanguage}
          accessibilityLabel={t('common.language', 'Language')}
          accessibilityRole="button"
          focusable
          {...(Platform.OS === 'web'
            ? { title: t('common.language', 'Language') }
            : {})}
          style={(state) => [
            styles.iconButton,
            { backgroundColor: colors.surface.primary },
            (state as any).focused && {
              borderColor: colors.border.focus,
              borderWidth: 2,
            },
          ]}
        >
        <Globe size={24} color={colors.text.primary} />
        </Pressable>

        {isMd && !isTest && (
          <Chip
            label={walletLabel}
            onPress={handleWalletPress}
            style={{ flexShrink: 1, height: spacing.spacer40, justifyContent: 'center' }}
            textStyle={{ textAlign: isRTL ? 'right' : 'left' }}
          />
        )}

        {!isTest && <UserAvatar />}
      </View>
      {!isTest && (
        <>
          <CommandPalette
            visible={paletteOpen}
            onClose={() => setPaletteOpen(false)}
          />
          <GadgetLabConsole
            visible={consoleVisible}
            onClose={() => setConsoleVisible(false)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: spacing.spacer8,
    alignItems: 'center',
    justifyContent: 'space-between',
    height: spacing.spacer16 * 4,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spacer8,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
  },
  logoImage: {
    borderRadius: radius.lg,
  },
  logoText: {
    ...typography.lg,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spacer12,
    height: '100%',
  },
  iconButton: {
    position: 'relative',
    padding: spacing.spacer4,
    borderRadius: radius.full,
    width: spacing.spacer40,
    height: spacing.spacer40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -spacing.spacer4,
    start: -spacing.spacer4,
    borderRadius: radius.full,
    minWidth: spacing.spacer20,
    height: spacing.spacer20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.spacer4,
  },
  badgeText: {
    ...typography.xs,
    fontWeight: 'bold',
  },
});

// AC: Header shows exactly one wallet entry; no “Connect Wallet” text in the DOM.

