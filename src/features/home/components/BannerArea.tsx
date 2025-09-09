import React, {
  memo,
  useState,
  useEffect,
  useRef,
  Suspense,
  lazy,
  useCallback,
} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Plus, Pencil } from 'lucide-react-native';
import { HeroBanner } from '@/types';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services';
import EmptyState from '@/shared/ui/EmptyState';
import { Spinner, Skeleton, Text, Heading, Button } from '@/ui';
import { spacing, radius, typography } from '@/ui/tokens';
import { routes } from '@/utils/routes';


const SmartImage = lazy(() => import('@/components/SmartImage'));

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32;
const BANNER_HEIGHT = (BANNER_WIDTH * 9) / 16;

interface BannerAreaProps {
  heroBanners: HeroBanner[];
  isStoreOwner: boolean;
  onAddBanner: () => void;
  onEditBanner: (banner: HeroBanner) => void;
  loading?: boolean;
}

function BannerArea({ heroBanners, isStoreOwner, onAddBanner, onEditBanner, loading }: BannerAreaProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { push } = useAppRouter();
  const bannerScrollRef = useRef<FlatList<HeroBanner>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const rotationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotateRef = useRef<() => void>();

  useEffect(() => {
    rotateRef.current = () => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % heroBanners.length;
        bannerScrollRef.current?.scrollToOffset({
          offset: nextIndex * (width - 32),
          animated: true,
        });
        return nextIndex;
      });
    };
  }, [heroBanners.length]);

  const scheduleNextRotation = useCallback(() => {
    if (heroBanners.length > 1) {
      if (rotationTimeoutRef.current) {
        clearTimeout(rotationTimeoutRef.current);
      }
      rotationTimeoutRef.current = setTimeout(() => {
        rotateRef.current?.();
      }, 5000);
    }
  }, [heroBanners.length]);

  useEffect(() => {
    scheduleNextRotation();
    return () => {
      if (rotationTimeoutRef.current) {
        clearTimeout(rotationTimeoutRef.current);
      }
    };
  }, [scheduleNextRotation]);
  const renderBanner = useCallback(
    ({ item }: { item: HeroBanner }) => (
      <View style={styles.heroBanner}>
        <TouchableOpacity
          style={styles.bannerTouchable}
          onPress={() => push(routes.category(item.category))}
        >
          <Suspense fallback={<Spinner />}>
            <SmartImage
              uri={item.image}
              width={BANNER_WIDTH}
              height={BANNER_HEIGHT}
              contentFit="cover"
            />
          </Suspense>
          <View
            style={[
              styles.heroOverlay,
              { backgroundColor: colors.background + '66' },
              { pointerEvents: 'none' },
            ]}
          >
            <View style={styles.heroContent}>
              {item.discount ? (
                <Text
                  style={[
                    typography.xs,
                    {
                      fontWeight: '600',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      alignSelf: 'flex-start',
                      marginBottom: 8,
                      color: colors.text.inverse,
                      backgroundColor: colors.gold,
                    },
                  ]}
                >
              {t('product.percentOff', { percent: item.discount })}
                </Text>
              ) : null}
              <Heading size="lg" style={{ color: colors.gold }}>
                {item.title}
              </Heading>

              <Text style={[typography.sm, { marginTop: 4, color: colors.gold }]}>
                {item.subtitle}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isStoreOwner && (
          <View style={styles.bannerAdminActions}>
            <TouchableOpacity
              style={[
                styles.bannerAdminButton,
                { backgroundColor: colors.background + 'CC' },
              ]}
              onPress={() => onEditBanner(item)}
            >
            <Pencil size={16} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    [colors, isStoreOwner, onEditBanner, push, t]
  );

  const keyExtractor = useCallback((item: HeroBanner) => item.id, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const newIndex = Math.round(event.nativeEvent.contentOffset.x / (width - 32));
      setCurrentIndex(newIndex);
      scheduleNextRotation();
    },
    [scheduleNextRotation]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Skeleton width={BANNER_WIDTH} height={BANNER_HEIGHT} borderRadius={radius.lg} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.bannerHeader}>
        {isStoreOwner && (
          <Button
            onPress={onAddBanner}
            style={[
              styles.addBannerButton,
              {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: colors.border.primary,
              },
            ]}
          >
            <Plus size={20} color={colors.text.primary} />
            <Text
              style={[
                typography.sm,
                { fontWeight: '600', marginStart: spacing.spacer8, color: colors.text.primary },
              ]}
            >
              {t('banner.addBanner')}
            </Text>
          </Button>
        )}
      </View>

      {heroBanners.length > 0 ? (
        <>
          <FlatList
            ref={bannerScrollRef}
            data={heroBanners}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            renderItem={renderBanner}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.bannerScrollContent}
          />

          {heroBanners.length > 1 && (
            <View style={[styles.bannerIndicators, { pointerEvents: 'none' }]}> 
              {heroBanners.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    { backgroundColor: colors.border.primary },
                    index === currentIndex && [
                      styles.activeIndicator,
                      { backgroundColor: colors.gold },
                    ],
                  ]}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <EmptyState
          icon={Plus}
          title={t('home.noBanners')}
          message={
            isStoreOwner ? t('home.addBanners') : t('home.bannersComingSoon')
          }
          actionText={isStoreOwner ? t('banner.addBanner') : undefined}
          onAction={isStoreOwner ? onAddBanner : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  addBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  bannerScrollContent: { paddingHorizontal: 16 },
  heroBanner: { marginRight: 16, position: 'relative' },
  bannerTouchable: { borderRadius: 12, overflow: 'hidden' },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    borderRadius: 12,
    zIndex: 1,
  },
  heroContent: { padding: 16 },
  heroDiscount: {},
  heroTitle: {},
  heroSubtitle: {},
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    zIndex: 1,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeIndicator: {},
  bannerAdminActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  bannerAdminButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(BannerArea);

