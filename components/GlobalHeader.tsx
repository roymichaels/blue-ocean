import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { Text, Button } from '@/ui';
import SmartImage from './SmartImage';
import { Heart, Search, Star } from 'lucide-react-native';
import { useAppRouter } from '@/services';
import { useLanguage } from '@/ui/ThemeProvider';
import { useTheme } from '@/ui/ThemeProvider';
import { useAppInfo } from '../contexts/AppInfoContext';
import { useRoadmap } from '../contexts/RoadmapContext';
import UserAvatar from './UserAvatar';
import { WishlistModal, useWishlistCount } from '@/features/cart';
import { spacing, radius, typography } from '@/ui/tokens';
import { usePathname } from 'expo-router';

interface GlobalHeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
}

export default function GlobalHeader({
  searchQuery = '',
  onSearchChange,
  showSearch = true,
}: GlobalHeaderProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { appName, logoCid } = useAppInfo();
  const { progress } = useRoadmap();
  const { push } = useAppRouter();
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const wishlistItemsCount = useWishlistCount();
  const pathname = usePathname();

  const navigateToReviews = () => {
    if (pathname !== '/reviews') {
      push('/reviews');
    }
  };

  return (
    <>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <Pressable
            style={styles.logo}
            onPress={() => {
              if (pathname !== '/') push('/');
            }}
          >
            {logoCid ? (
              <SmartImage uri={logoCid} width={50} height={50} style={styles.logoImage} contentFit="contain" />
            ) : (
              <View
                style={[styles.logoIcon, { backgroundColor: colors.gold }]}
              />
            )}
            <Text style={[styles.logoText, { color: colors.gold }]}>
              {appName || t('ageVerification.platformName')}
            </Text>
          </Pressable>
          <View style={styles.headerIcons}>
            <Button
              style={[
                styles.iconButton,
                { backgroundColor: colors.surface.primary },
              ]}
              onPress={navigateToReviews}
            >
              <Star size={24} color={colors.text.primary} />
            </Button>
            <Button
              style={[
                styles.iconButton,
                { backgroundColor: colors.surface.primary },
              ]}
              onPress={() => setShowWishlistModal(true)}
            >
              <Heart size={24} color={colors.text.primary} />
              {wishlistItemsCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.gold }]}> 
                  <Text
                    style={[styles.badgeText, { color: colors.text.inverse }]}
                  >
                    {wishlistItemsCount}
                  </Text>
                </View>
              )}
            </Button>
            <View
              style={[
                styles.progressContainer,
                { backgroundColor: colors.surface.primary },
              ]}
            >
              <Text
                style={[styles.progressText, { color: colors.text.primary }]}
              >
                {Math.round(progress)}%
              </Text>
            </View>
            <UserAvatar />
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <Search size={20} color={colors.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text.primary }]}
              placeholder={t('home.searchPlaceholder')}
              value={searchQuery}
              onChangeText={onSearchChange}
              textAlign="right"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        )}
      </View>

      <WishlistModal
        visible={showWishlistModal}
        onClose={() => setShowWishlistModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.spacer16,
    paddingTop: spacing.spacer16,
    paddingBottom: spacing.spacer20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spacer16,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    marginLeft: spacing.spacer8,
  },
  logoImage: {
    borderRadius: radius.lg,
    marginLeft: spacing.spacer8,
  },
  logoText: {
    ...typography.lg,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spacer16,
  },
  iconButton: {
    position: 'relative',
    padding: spacing.spacer4,
    borderRadius: radius.full,
    width: spacing.spacer40,
    height: spacing.spacer40,
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
  progressContainer: {
    paddingHorizontal: spacing.spacer8,
    paddingVertical: spacing.spacer4,
    borderRadius: radius.md,
  },
  progressText: {
    ...typography.xs,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.spacer16,
    paddingVertical: spacing.spacer12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...typography.md,
    marginLeft: spacing.spacer12,
  },
});
