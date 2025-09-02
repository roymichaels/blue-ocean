import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import SmartImage from './SmartImage';
import { Heart, Search, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppInfo } from '../contexts/AppInfoContext';
import { useRoadmap } from '../contexts/RoadmapContext';
import UserAvatar from './UserAvatar';
import WishlistModal from '@/features/cart/components/WishlistModal';
import CartService from '@/features/cart/services/cart';
import { spacing, radius } from '@/shared/ui/tokens';

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
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistItemsCount, setWishlistItemsCount] = useState(0);

  useEffect(() => {
    const cartService = CartService.getInstance();

    const updateCounts = () => {
      setWishlistItemsCount(cartService.getWishlistItemsCount());
    };

    updateCounts();
    cartService.addListener(updateCounts);

    return () => cartService.removeListener(updateCounts);
  }, []);

  const navigateToReviews = () => {
    router.push('/reviews');
  };

  return (
    <>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.logo}
            onPress={() => router.push('/')}
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
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.surface.primary },
              ]}
              onPress={navigateToReviews}
            >
              <Star size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
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
            </TouchableOpacity>
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
              textAlign="end"
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
    fontSize: 20,
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
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    paddingHorizontal: spacing.spacer8,
    paddingVertical: spacing.spacer4,
    borderRadius: radius.md,
  },
  progressText: {
    fontSize: 12,
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
    fontSize: 16,
    marginLeft: spacing.spacer12,
  },
});
