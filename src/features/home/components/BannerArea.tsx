import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { HeroBanner } from '@/types';
import { Plus, Pencil } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Spinner from '@/shared/ui/Spinner';
import EmptyState from '@/shared/ui/EmptyState';

const SmartImage = lazy(() => import('@/components/SmartImage'));

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32;
const BANNER_HEIGHT = (BANNER_WIDTH * 9) / 16;

interface BannerAreaProps {
  heroBanners: HeroBanner[];
  isStoreOwner: boolean;
  onAdd: () => void;
  onEdit: (banner: HeroBanner) => void;
  onBannerPress: (categoryId: string) => void;
}

export default function BannerArea({
  heroBanners,
  isStoreOwner,
  onAdd,
  onEdit,
  onBannerPress,
}: BannerAreaProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const bannerScrollRef = useRef<ScrollView>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    if (heroBanners.length > 1) {
      const bannerInterval = setInterval(() => {
        setCurrentBannerIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % heroBanners.length;
          bannerScrollRef.current?.scrollTo({
            x: nextIndex * (width - 32),
            animated: true,
          });
          return nextIndex;
        });
      }, 5000);
      return () => clearInterval(bannerInterval);
    }
  }, [heroBanners.length]);

  const renderBanner = (item: HeroBanner) => (
    <View key={item.id} style={styles.heroBanner}>
      <TouchableOpacity
        style={styles.bannerTouchable}
        onPress={() => onBannerPress(item.category)}
      >
        <Suspense fallback={<Spinner />}>
          <SmartImage
            uri={item.image}
            width={BANNER_WIDTH}
            height={BANNER_HEIGHT}
            contentFit="cover"
          />
        </Suspense>
        <View style={styles.heroOverlay}>
          <View style={styles.heroContent}>
            {item.discount ? (
              <Text
                style={[
                  styles.heroDiscount,
                  { color: colors.text.inverse, backgroundColor: colors.gold },
                ]}
              >
                {item.discount} הנחה
              </Text>
            ) : null}
            <Text style={[styles.heroTitle, { color: colors.gold }]}>
              {item.title}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.gold }]}>
              {item.subtitle}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      {isStoreOwner && (
        <View style={styles.bannerAdminActions}>
          <TouchableOpacity
            style={styles.bannerAdminButton}
            onPress={() => onEdit(item)}
          >
            <Pencil size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerHeader}>
        {isStoreOwner && (
          <TouchableOpacity
            style={[styles.addBannerButton, { backgroundColor: colors.gold }]}
            onPress={onAdd}
          >
            <Plus size={20} color={colors.text.inverse} />
            <Text style={[styles.addBannerText, { color: colors.text.inverse }]}>
              {t('banner.addBanner')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {heroBanners.length > 0 ? (
        <>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / (width - 32)
              );
              setCurrentBannerIndex(newIndex);
            }}
            contentContainerStyle={styles.bannerScrollContent}
          >
            {heroBanners.map((item) => renderBanner(item))}
          </ScrollView>

          {heroBanners.length > 1 && (
            <View style={styles.bannerIndicators}>
              {heroBanners.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentBannerIndex && [
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
          onAction={isStoreOwner ? onAdd : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    height: BANNER_HEIGHT + 40,
    marginBottom: 24,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  addBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBannerText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bannerScrollContent: {
    paddingHorizontal: 16,
  },
  heroBanner: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerTouchable: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    bottom: 0,
    backgroundColor: 'rgba(14, 13, 10, 0.4)',
    justifyContent: 'center',
  },
  heroContent: {
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  heroDiscount: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'right',
  },
  heroSubtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'right',
  },
  bannerAdminActions: {
    position: 'absolute',
    top: 8,
    start: 8,
    flexDirection: 'row',
  },
  bannerAdminButton: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  bannerIndicators: {
    position: 'absolute',
    bottom: 16,
    start: 0,
    end: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    width: 16,
  },
});
