import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Heading, Text, Button, Skeleton } from '@/ui/primitives';
import { Stack } from '@/ui/layout';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { useWallet } from '@/contexts/WalletProvider';
import { useAuth } from '@/features/auth/AuthContext';
import { useStores } from '@/services/useStores';
import { useProducts } from '@/services';
import { useTenant } from '@/contexts/TenantContext';
import { useAppRouter } from '@/services/useAppRouter';
import { useNotificationActions } from '@/components/NotificationContext';
import { chainAdapter } from '@/services/chain';
import { routes } from '@/utils/routes';
import { Order, Store } from '@/types';
import { errorLog } from '@/utils/logger';
import {
  CheckCircle,
  Circle,
  Package,
  ShoppingCart,
  Store as StoreIcon,
  type LucideProps,
} from 'lucide-react-native';

interface AdminOnboardingChecklistProps {
  onAddProduct?: () => void;
}

interface StepConfig {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  loading?: boolean;
  helperText?: string | null;
  Icon: React.ComponentType<LucideProps>;
}

const StepRow: React.FC<{ step: StepConfig; colors: any }> = ({ step, colors }) => {
  const StatusIcon: React.ComponentType<LucideProps> = step.completed ? CheckCircle : step.Icon;
  return (
    <View style={styles.stepRow} accessibilityRole="summary">
      <StatusIcon
        size={22}
        color={step.completed ? colors.gold : colors.text.secondary}
        accessibilityElementsHidden
      />
      <View style={styles.stepBody}>
        <Heading size="sm" style={{ color: colors.text.primary }}>
          {step.title}
        </Heading>
        {step.loading && !step.completed ? (
          <Skeleton height={12} width="80%" style={{ marginTop: 4 }} />
        ) : (
          <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
            {step.description}
          </Text>
        )}
        {step.helperText && !step.completed ? (
          <Text style={[styles.helperText, { color: colors.status.warning }]}>
            {step.helperText}
          </Text>
        ) : null}
      </View>
      {step.actionLabel ? (
        <Button
          title={step.actionLabel}
          onPress={step.onAction}
          disabled={step.disabled}
          loading={step.loading}
          style={styles.stepButton}
        />
      ) : null}
    </View>
  );
};

export default function AdminOnboardingChecklist({ onAddProduct }: AdminOnboardingChecklistProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { address, connect } = useWallet();
  const { isStoreOwner } = useAuth();
  const { tenantId } = useTenant();
  const { push } = useAppRouter();
  const { showNotification } = useNotificationActions();

  const { data: stores = [], isLoading: storesLoading, refetch: refetchStores, isRefetching: storesRefetching } =
    useStores('default');

  const ownedStores = useMemo(() => {
    if (!address) return [] as Store[];
    const lower = address.toLowerCase();
    return stores.filter((s) => s.owner?.toLowerCase() === lower);
  }, [stores, address]);

  const primaryStore = useMemo(() => {
    if (tenantId) {
      const match = ownedStores.find((s) => s.id === tenantId);
      if (match) return match;
    }
    return ownedStores[0] ?? null;
  }, [ownedStores, tenantId]);

  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
    isRefetching: productsRefetching,
  } = useProducts(primaryStore?.id ?? null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const loadOrders = useCallback(async (): Promise<boolean> => {
    if (!primaryStore?.id || !chainAdapter.listOrdersBySeller) {
      setOrders([]);
      return true;
    }
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const list = await chainAdapter.listOrdersBySeller(
        primaryStore.id,
        primaryStore.owner || address || primaryStore.id,
      );
      setOrders(list);
      return true;
    } catch (err) {
      errorLog('Failed to load onboarding order progress', err);
      setOrdersError(
        t('home.adminChecklistOrderError', 'Order history is temporarily unavailable. Try again shortly.'),
      );
      return false;
    } finally {
      setOrdersLoading(false);
    }
  }, [address, primaryStore, t]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const isConnected = !!address;
  const hasStore = ownedStores.length > 0;
  const hasProduct = products.length > 0;
  const hasCheckout = orders.length > 0;

  const handleCreateStore = useCallback(() => {
    if (!isConnected) {
      connect();
      return;
    }
    push(routes.createStore());
  }, [connect, isConnected, push]);

  const handleManageStore = useCallback(() => {
    if (!primaryStore) return;
    push(`/store/${primaryStore.id}/admin`);
  }, [primaryStore, push]);

  const handleManageProducts = useCallback(() => {
    if (onAddProduct) {
      onAddProduct();
      return;
    }
    if (!primaryStore) return;
    push(`/store/${primaryStore.id}/admin/products`);
  }, [onAddProduct, primaryStore, push]);

  const handleTestCheckout = useCallback(() => {
    if (!primaryStore) return;
    push(`/store/${primaryStore.id}`);
  }, [primaryStore, push]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchStores(), primaryStore?.id ? refetchProducts() : Promise.resolve()]);
    const success = await loadOrders();
    showNotification(
      success ? t('common.updated', 'Updated') : t('common.warning', 'Warning'),
      success
        ? t('home.adminChecklistRefreshed', 'Progress refreshed successfully.')
        : t('home.adminChecklistRefreshFailed', 'Some checklist data could not be refreshed.'),
      success ? 'success' : 'warning',
    );
  }, [loadOrders, primaryStore?.id, refetchProducts, refetchStores, showNotification, t]);

  const steps: StepConfig[] = [
    {
      key: 'connect',
      title: t('home.adminChecklistConnectTitle', 'Connect your wallet'),
      description: t(
        'home.adminChecklistConnectDescription',
        'Link your wallet to unlock store management tools.',
      ),
      completed: isConnected,
      actionLabel: isConnected ? undefined : t('auth.login', 'Login'),
      onAction: isConnected ? undefined : connect,
      Icon: Circle,
    },
    {
      key: 'store',
      title: t('home.adminChecklistStoreTitle', 'Create your store'),
      description: t(
        'home.adminChecklistStoreDescription',
        'Set your branding, fulfillment preferences and payout details.',
      ),
      completed: hasStore,
      actionLabel: hasStore ? t('home.manageStore', 'Manage store') : t('home.create_store', 'Create Store'),
      onAction: hasStore ? handleManageStore : handleCreateStore,
      disabled: !isConnected,
      loading: storesLoading || storesRefetching,
      Icon: StoreIcon,
    },
    {
      key: 'product',
      title: t('home.adminChecklistProductTitle', 'Add your first product'),
      description: t(
        'home.adminChecklistProductDescription',
        'Add pricing, inventory and rich media so shoppers can browse.',
      ),
      completed: hasProduct,
      actionLabel: hasProduct
        ? t('home.manageProducts', 'Manage products')
        : t('home.addProduct', 'Add product'),
      onAction: handleManageProducts,
      disabled: !hasStore,
      loading: productsLoading || productsRefetching,
      Icon: Package,
    },
    {
      key: 'checkout',
      title: t('home.adminChecklistCheckoutTitle', 'Place a test order'),
      description: t(
        'home.adminChecklistCheckoutDescription',
        'Verify that checkout, notifications and fulfillment work end-to-end.',
      ),
      completed: hasCheckout,
      actionLabel: hasCheckout
        ? t('navigation.orders', 'Orders')
        : t('home.testCheckout', 'Open storefront'),
      onAction: hasCheckout ? handleManageStore : handleTestCheckout,
      disabled: !hasProduct,
      loading: ordersLoading,
      helperText: ordersError,
      Icon: ShoppingCart,
    },
  ];

  const shouldShow = isConnected || isStoreOwner || hasStore || onAddProduct;
  if (!shouldShow) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <Stack gap="spacer12">
        <Stack gap="spacer4">
          <Heading size="md" style={{ color: colors.text.primary }}>
            {t('home.adminChecklistTitle', 'Store owner quickstart')}
          </Heading>
          <Text style={{ color: colors.text.secondary }}>
            {t(
              'home.adminChecklistSubtitle',
              'Complete the guided steps below to go from configuration to first checkout.',
            )}
          </Text>
        </Stack>
        <Stack gap="spacer12">
          {steps.map((step) => (
            <StepRow key={step.key} step={step} colors={colors} />
          ))}
        </Stack>
        <Button
          title={t('common.reload', 'Reload')}
          onPress={handleRefresh}
          loading={storesRefetching || productsRefetching || ordersLoading}
          style={styles.refreshButton}
        />
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBody: {
    flex: 1,
    gap: 4,
  },
  stepDescription: {
    fontSize: 12,
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
  },
  stepButton: {
    marginTop: 4,
  },
  refreshButton: {
    alignSelf: 'flex-start',
  },
});

