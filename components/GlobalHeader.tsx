// TOUCHPOINT: components/GlobalHeader.tsx — editing per “Kill wallet CTA + horizontal premium cards”
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Text, Chip } from '@/ui';
import SmartImage from './SmartImage';
import { Search, Bell, Globe } from 'lucide-react-native';
import { useAppRouter } from '@/services';
import { useLanguage } from '@/ui/ThemeProvider';
import { useTheme } from '@/ui/ThemeProvider';
import { useAppInfo } from '../contexts/AppInfoContext';
import UserAvatar from './UserAvatar';
import CommandPalette from './CommandPalette';
import { spacing, radius, typography } from '@/ui/tokens';
import { usePathname } from 'expo-router';
import { useNotificationState } from './NotificationContext';
import { useWallet } from '@/contexts/WalletProvider';

interface GlobalHeaderProps {
  showSearch?: boolean;
}

export default function GlobalHeader({ showSearch = true }: GlobalHeaderProps) {
  const { t, isRTL, currentLanguage, setLanguage } = useLanguage();
  const { colors } = useTheme();
  const { appName, logoCid } = useAppInfo();
  const { push } = useAppRouter();
  const { unreadCount, refreshNotifications } = useNotificationState();
  const { address, connect } = useWallet();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isMd = width >= 768;
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  const handleSearchSubmit = () => {
    setSearchOpen(false);
    if (pathname !== '/' && pathname !== '/index') push('/');
  };

  const walletLabel = address
    ? `@${address}`
    : t('wallet.notConnected', 'Not connected');
  const handleWalletPress = async () => {
    await connect();
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
        onPress={() => {
          if (pathname !== '/') push('/');
        }}
        accessibilityRole="button"
      >
        {logoCid ? (
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
          searchOpen ? (
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    color: colors.text.primary,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                placeholder={t('home.searchPlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                value={query}
                onChangeText={setQuery}
                autoFocus
                onSubmitEditing={handleSearchSubmit}
                onBlur={() => setSearchOpen(false)}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => setSearchOpen(true)}
              accessibilityLabel={t('home.searchPlaceholder')}
              accessibilityRole="button"
              focusable
              {...(Platform.OS === 'web'
                ? { title: t('home.searchPlaceholder') }
                : {})}
              style={({ focused }) => [
                styles.iconButton,
                { backgroundColor: colors.surface.primary },
                focused && {
                  borderColor: colors.border.focus,
                  borderWidth: 2,
                },
              ]}
            >
              <Search size={24} color={colors.text.primary} />
            </Pressable>
          )
        )}

        <Pressable
          onPress={refreshNotifications}
          accessibilityLabel={t('notifications.notifications')}
          accessibilityRole="button"
          focusable
          {...(Platform.OS === 'web'
            ? { title: t('notifications.notifications') }
            : {})}
          style={({ focused }) => [
            styles.iconButton,
            { backgroundColor: colors.surface.primary },
            focused && {
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
          style={({ focused }) => [
            styles.iconButton,
            { backgroundColor: colors.surface.primary },
            focused && {
              borderColor: colors.border.focus,
              borderWidth: 2,
            },
          ]}
        >
        <Globe size={24} color={colors.text.primary} />
        </Pressable>

        // DOCME: wallet status chip
        <Chip
          label={walletLabel}
          onPress={handleWalletPress}
          style={{ flexShrink: 1, height: spacing.spacer40, justifyContent: 'center' }}
          textStyle={{ textAlign: isRTL ? 'right' : 'left' }}
        />

        <UserAvatar />
      </View>
      <CommandPalette
        visible={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.spacer16,
    paddingVertical: spacing.spacer8,
    borderWidth: 1,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    ...typography.md,
  },
});

// Header now has exactly ONE wallet entry point. No text 'Connect Wallet' is rendered.

