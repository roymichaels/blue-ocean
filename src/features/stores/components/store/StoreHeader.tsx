import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { Heading, Text, Skeleton } from '@/ui/primitives';
import { spacing, radius } from '@/shared/ui/tokens';
import { Star } from 'lucide-react-native';

interface Props {
  name: string;
  reputation?: number;
  bannerUri?: string | null;
  avatarUri?: string | null;
  tagline?: string | null;
}

export default function StoreHeader({
  name,
  reputation = 0,
  bannerUri,
  avatarUri,
  tagline,
}: Props) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const fallbackName = name || t('stores.storeName');
  const bannerLabel = t('stores.bannerAlt', { name: fallbackName });
  const avatarLabel = t('stores.avatarAlt', { name: fallbackName });

  return (
    <View>
      <View
        style={[styles.banner, { backgroundColor: colors.surface.secondary }]}
        accessible={!!bannerUri}
        accessibilityRole="image"
        accessibilityLabel={bannerUri ? bannerLabel : undefined}
      >
        {bannerUri ? (
          <Image
            source={{ uri: bannerUri }}
            style={styles.bannerImage}
            resizeMode="cover"
            accessible
            accessibilityRole="image"
            accessibilityLabel={bannerLabel}
          />
        ) : null}
      </View>
      <View
        style={[
          styles.profileRow,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View
          style={[
            styles.avatarWrapper,
            {
              borderColor: colors.background,
              backgroundColor: colors.surface.primary,
            },
          ]}
        >
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatarImage}
              resizeMode="cover"
              accessible
              accessibilityRole="image"
              accessibilityLabel={avatarLabel}
            />
          ) : (
            <View
              style={[styles.avatarPlaceholder, { backgroundColor: colors.surface.secondary }]}
              accessible
              accessibilityRole="image"
              accessibilityLabel={avatarLabel}
            >
              <Text variant="lg" weight="600" style={{ color: colors.text.secondary }}>
                {fallbackName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View
          style={[
            styles.info,
            {
              alignItems: isRTL ? 'flex-end' : 'flex-start',
              marginStart: isRTL ? 0 : spacing.spacer16,
              marginEnd: isRTL ? spacing.spacer16 : 0,
            },
          ]}
        >
          <Heading
            size="xl"
            style={{
              color: colors.text.primary,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {fallbackName}
          </Heading>
          <View
            style={[
              styles.ratingRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Star size={16} color={colors.gold} />
            <Text
              variant="sm"
              weight="500"
              style={{
                color: colors.text.primary,
                marginStart: isRTL ? 0 : spacing.spacer4,
                marginEnd: isRTL ? spacing.spacer4 : 0,
              }}
            >
              {t('stores.reputation', 'Reputation:')} {reputation.toFixed(1)}
            </Text>
          </View>
          {tagline ? (
            <Text
              variant="sm"
              style={{
                color: colors.text.secondary,
                textAlign: isRTL ? 'right' : 'left',
                marginTop: spacing.spacer4,
              }}
            >
              {tagline}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function StoreHeaderSkeleton() {
  return (
    <View>
      <Skeleton height={160} />
      <View style={styles.skeletonRow}>
        <Skeleton width={72} height={72} borderRadius={36} />
        <View style={styles.skeletonInfo}>
          <Skeleton height={24} width="60%" />
          <Skeleton height={16} width="40%" style={styles.skeletonLine} />
          <Skeleton height={16} width="70%" style={styles.skeletonLine} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    height: 160,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  profileRow: {
    marginTop: -36,
    paddingHorizontal: spacing.spacer16,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  ratingRow: {
    alignItems: 'center',
    marginTop: spacing.spacer4,
  },
  skeletonRow: {
    marginTop: -36,
    paddingHorizontal: spacing.spacer16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonInfo: {
    flex: 1,
    marginStart: spacing.spacer16,
  },
  skeletonLine: {
    marginTop: spacing.spacer8,
  },
});

