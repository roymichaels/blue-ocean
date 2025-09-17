import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { Text, Button } from '@/ui/primitives';
import StoreHeader, { StoreHeaderSkeleton } from '@/features/stores/components/store/StoreHeader';
import CategoryChips from '@/features/home/components/CategoryChips';
import { ProductGrid, ProductCardSkeleton } from '@/features/products';
import { useProducts, useCategories, useStoreReviews } from '@/services';
import { useStoreProfile } from '@/features/stores/hooks/useStoreProfile';
import type { Product } from '@/types';
import { spacing, radius } from '@/shared/ui/tokens';
import EmptyState from '@/shared/ui/EmptyState';
import { useNotificationActions } from '@/components/NotificationContext';
import { useAppRouter } from '@/services/useAppRouter';
import { useAuth } from '@/features/auth/AuthContext';
import { useAuthModal } from '@/features/auth/AuthModalContext';
import { openDM } from '@/services/openDM';
import { openProduct } from '@/services/openProduct';
import { isDriverChatEnabled } from '@/config/featureFlags';
import { AlertTriangle } from 'lucide-react-native';

export default function StoreScreen() {
  const { storeId: rawStoreId } = useLocalSearchParams<{ storeId: string }>();
  const storeId = typeof rawStoreId === 'string' ? rawStoreId : undefined;
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { showNotification } = useNotificationActions();
  const appRouter = useAppRouter();
  const { isLoggedIn } = useAuth();
  const { openAuthModal } = useAuthModal();

  const { store, isLoading: storeLoading, error: storeError, isOffline } = useStoreProfile(storeId);
  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
    isRefetching: productsRefetching,
    error: productsError,
  } = useProducts(storeId ?? null);
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    refetch: refetchCategories,
    isRefetching: categoriesRefetching,
    error: categoriesError,
  } = useCategories(storeId ?? null);
  const { data: { score: reputationScore } = { score: 0 } } = useStoreReviews(storeId ?? null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [contacting, setContacting] = useState(false);
  const driverChatEnabled = useMemo(() => isDriverChatEnabled(), []);

  const refreshing = productsRefetching || categoriesRefetching;

  const handleRefresh = useCallback(() => {
    void Promise.all([refetchProducts(), refetchCategories()]);
  }, [refetchProducts, refetchCategories]);

  const handleProductPress = useCallback((product: Product) => {
    void openProduct(product.id);
  }, []);

  const storeIdentifier = store?.id || storeId;
  const contactLabel = t('productDetail.contactStore', 'Contact store');
  const contactHint = driverChatEnabled
    ? t('productDetail.contactStoreHint', 'Open a chat with this store.')
    : t('common.comingSoon', 'Coming Soon');

  const handleContactStore = useCallback(async () => {
    if (!driverChatEnabled) {
      return;
    }

    if (!storeIdentifier) {
      showNotification(
        t('common.error', 'Error'),
        t(
          'productDetail.contactStoreError',
          'We could not start a chat with this store. Please try again later.',
        ),
        'error',
      );
      return;
    }

    if (!isLoggedIn) {
      openAuthModal();
      return;
    }

    setContacting(true);
    try {
      await openDM(storeIdentifier);
      appRouter.push('/messages');
    } catch (err) {
      if (err instanceof Error && err.message === 'WALLET_REQUIRED') {
        openAuthModal();
        showNotification(
          t('common.error', 'Error'),
          t('auth.walletConnectionFailed', 'Wallet connection failed'),
          'error',
        );
      } else {
        showNotification(
          t('common.error', 'Error'),
          err instanceof Error
            ? err.message
            : t(
                'productDetail.contactStoreError',
                'We could not start a chat with this store. Please try again later.',
              ),
          'error',
        );
      }
    } finally {
      setContacting(false);
    }
  }, [appRouter, driverChatEnabled, isLoggedIn, openAuthModal, openDM, showNotification, storeIdentifier, t]);

  const loadError = storeError || productsError || categoriesError;
  const loadErrorMessage = loadError
    ? loadError instanceof Error
      ? loadError.message
      : String(loadError)
    : null;

  const filteredProducts = useMemo(
    () =>
      selectedCategory
        ? products.filter((product) => product.category === selectedCategory)
        : products,
    [products, selectedCategory],
  );

  const bannerUri = useMemo(() => {
    if (!store) return null;
    const raw = (store as Record<string, unknown>).bannerUri;
    return typeof raw === 'string' ? raw : null;
  }, [store]);

  const avatarUri = useMemo(() => {
    if (!store) return null;
    const raw = (store as Record<string, unknown>).avatarUri;
    return typeof raw === 'string' ? raw : null;
  }, [store]);

  const tagline = useMemo(() => {
    if (!store) return null;
    const raw =
      (store as Record<string, unknown>).tagline ??
      (store as Record<string, unknown>).tagLine ??
      (store as Record<string, unknown>).description;
    return typeof raw === 'string' && raw.trim().length > 0 ? raw : null;
  }, [store]);

  const reputation = useMemo(() => {
    if (typeof reputationScore === 'number' && reputationScore > 0) {
      return reputationScore;
    }
    if (store && typeof store.reputation === 'number') {
      return store.reputation;
    }
    return 0;
  }, [reputationScore, store]);

  if (!storeId && !store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <EmptyState
          icon={AlertTriangle}
          title={t('store.not_found', 'Store not found')}
          message={t('store.not_found_sub', "We couldn't find that store.")}
        />
      </View>
    );
  }

  if (!store && storeLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <StoreHeaderSkeleton />
        <View style={styles.productSkeletonRow}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={styles.productSkeletonWrapper}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!store && loadErrorMessage) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <EmptyState
          icon={AlertTriangle}
          title={t('store.not_found', 'Store not found')}
          message={loadErrorMessage}
        />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <EmptyState
          icon={AlertTriangle}
          title={t('store.not_found', 'Store not found')}
          message={t('store.not_found_sub', "We couldn't find that store.")}
        />
      </View>
    );
  }

  const showCategories = categories.length > 0 && !categoriesLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <StoreHeader
        name={store.name}
        reputation={reputation}
        bannerUri={bannerUri}
        avatarUri={avatarUri}
        tagline={tagline}
      />

      <View
        style={[
          styles.actionsRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <Button
          title={contactLabel}
          accessibilityLabel={contactLabel}
          accessibilityHint={contactHint}
          onPress={handleContactStore}
          loading={contacting}
          disabled={!driverChatEnabled || !storeIdentifier || contacting}
          tooltip={contactHint}
        />
      </View>

      {isOffline ? (
        <Text
          variant="sm"
          style={{
            marginHorizontal: spacing.spacer16,
            marginTop: spacing.spacer8,
            color: colors.status.warning,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {t(
            'stores.offlineNotice',
            'Viewing cached data. Some details may be out of date.',
          )}
        </Text>
      ) : null}

      {showCategories ? (
        <View style={{ marginTop: spacing.spacer16 }}>
          <CategoryChips
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        </View>
      ) : null}

      <View style={styles.catalogContainer}>
        {loadErrorMessage ? (
          <EmptyState
            icon={AlertTriangle}
            title={t('home.loadErrorTitle', 'Unable to load products')}
            message={loadErrorMessage}
            actionText={t('common.reload', 'Reload')}
            onAction={handleRefresh}
          />
        ) : (
          <ProductGrid
            products={filteredProducts}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onProductPress={handleProductPress}
            loading={productsLoading}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionsRow: {
    paddingHorizontal: spacing.spacer16,
    paddingTop: spacing.spacer16,
  },
  catalogContainer: {
    flex: 1,
    paddingTop: spacing.spacer8,
  },
});

