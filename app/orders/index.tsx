import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import { Button, Heading, Skeleton, Text } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import EmptyState from '@/shared/ui/EmptyState';
import { useWallet } from '@/contexts/WalletProvider';
import { chainAdapter } from '@/services/chain';
import { Order } from '@/types';
import { errorLog } from '@/utils/logger';
import { useCurrency } from '@/contexts/CurrencyContext';
import { AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react-native';

const PAGE_SIZE = 20;

function OrderSkeletonRow() {
  return (
    <Stack gap="spacer12" style={{ marginBottom: 16 }}>
      <Skeleton height={16} width="60%" />
      <Skeleton height={12} width="40%" />
      <Skeleton height={12} width="80%" />
    </Stack>
  );
}

interface OrderListItemProps {
  order: Order;
  color: string;
  subtle: string;
  currencyPrefix: string;
  borderColor: string;
  background: string;
}

function OrderListItem({
  order,
  color,
  subtle,
  currencyPrefix,
  borderColor,
  background,
}: OrderListItemProps) {
  const createdAtLabel = useMemo(() => {
    if (!order.createdAt) return '—';
    const date = new Date(order.createdAt);
    if (Number.isNaN(date.getTime())) return order.createdAt;
    return date.toLocaleString();
  }, [order.createdAt]);

  return (
    <View
      style={[styles.row, { borderColor, backgroundColor: background }]}
      accessibilityRole="summary"
    >
      <Text style={[styles.rowId, { color }]} numberOfLines={1}>
        #{order.id}
      </Text>
      <Text style={[styles.rowMeta, { color: subtle }]}>{createdAtLabel}</Text>
      <Stack direction="horizontal" justify="space-between" align="center">
        <Text style={[styles.rowStatus, { color }]}>{order.status}</Text>
        <Text style={[styles.rowTotal, { color }]}>
          {currencyPrefix}
          {order.total?.toFixed?.(2) ?? order.total}
        </Text>
      </Stack>
    </View>
  );
}

export default function OrdersScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { address, connect } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [remainingOrders, setRemainingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currencySymbol } = useCurrency();

  const supportsBuyerOrders = typeof chainAdapter.listOrdersByBuyer === 'function';

  const fetchOrders = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!address || !supportsBuyerOrders) return;
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const list = await chainAdapter.listOrdersByBuyer!(address);
        const sorted = [...list].sort((a, b) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        setOrders(sorted.slice(0, PAGE_SIZE));
        setRemainingOrders(sorted.slice(PAGE_SIZE));
      } catch (err) {
        errorLog('Failed to load buyer orders', err);
        setError(t('orders.loadError', 'Unable to load your orders. Please try again.'));
      } finally {
        if (mode === 'initial') {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [address, supportsBuyerOrders, t],
  );

  useEffect(() => {
    if (!address || !supportsBuyerOrders) {
      setOrders([]);
      setRemainingOrders([]);
      return;
    }
    fetchOrders('initial').catch(() => {});
  }, [address, supportsBuyerOrders, fetchOrders]);

  const handleRefresh = useCallback(() => {
    void fetchOrders('refresh');
  }, [fetchOrders]);

  const handleLoadMore = useCallback(() => {
    setRemainingOrders((prevRemaining) => {
      if (prevRemaining.length === 0) return prevRemaining;
      const nextBatch = prevRemaining.slice(0, PAGE_SIZE);
      setOrders((prevOrders) => [...prevOrders, ...nextBatch]);
      return prevRemaining.slice(PAGE_SIZE);
    });
  }, []);

  if (!supportsBuyerOrders) {
    return (
      <ScrollArea backgroundColor={colors.canvas}>
        <Container>
          <EmptyState
            icon={AlertTriangle}
            title={t('orders.unsupportedTitle', 'Orders unavailable')}
            message={t(
              'orders.unsupportedDescription',
              'Your current network does not expose buyer order history yet.'
            )}
          />
        </Container>
      </ScrollArea>
    );
  }

  if (!address) {
    return (
      <ScrollArea backgroundColor={colors.canvas}>
        <Container>
          <Heading size="xl">{t('navigation.orders', 'Orders')}</Heading>
          <View style={{ height: 16 }} />
          <EmptyState
            icon={ShoppingCart}
            title={t('orders.connectTitle', 'Connect to view orders')}
            message={t(
              'orders.connectDescription',
              'Link your wallet to follow purchases and delivery updates.'
            )}
            actionText={t('auth.login', 'Login')}
            onAction={connect}
          />
        </Container>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea
      backgroundColor={colors.canvas}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gold} />
      }
    >
      <Container>
        <Heading size="xl">{t('navigation.orders', 'Orders')}</Heading>
        <View style={{ height: 16 }} />
        {loading ? (
          <View>
            {Array.from({ length: 3 }).map((_, idx) => (
              <OrderSkeletonRow key={`skeleton-${idx}`} />
            ))}
          </View>
        ) : error ? (
          <EmptyState
            icon={RefreshCw}
            title={t('orders.loadErrorTitle', 'Something went wrong')}
            message={error}
            actionText={t('common.reload', 'Reload')}
            onAction={() => fetchOrders('initial')}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={t('orders.emptyTitle', 'No orders yet')}
            message={t(
              'orders.emptyDescription',
              'Start by adding an item to your cart and completing checkout.'
            )}
          />
        ) : (
          <Stack gap="spacer16">
            {orders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order}
                color={colors.text.primary}
                subtle={colors.text.secondary}
                currencyPrefix={currencySymbol}
                borderColor={colors.border.primary}
                background={colors.surface.primary}
              />
            ))}
            {remainingOrders.length > 0 ? (
              <Button title={t('common.loadMore', 'Load more')} onPress={handleLoadMore} />
            ) : null}
          </Stack>
        )}
      </Container>
    </ScrollArea>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  rowId: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  rowMeta: {
    fontSize: 12,
    marginBottom: 8,
  },
  rowStatus: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  rowTotal: {
    fontWeight: '700',
  },
});

