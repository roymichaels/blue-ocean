import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import { Heading, Text, Card, Button, Skeleton } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { useWallet } from '@/contexts/WalletProvider';
import { useCurrency } from '@/contexts/CurrencyContext';
import EmptyState from '@/shared/ui/EmptyState';
import { chainAdapter } from '@/services/chain';
import { Order } from '@/types';
import { errorLog } from '@/utils/logger';
import { AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react-native';
import { useAppRouter } from '@/services/useAppRouter';
import { ordersWarmCache } from '@/services/nearOrders';
import { loadKycReceipt } from '@/services/kycReceipts';
import { getPublicKeyHex } from '@/services/localIdentity';
import OrderTimeline from '@/components/OrderTimeline';

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatAmount(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2);
}

function OrderDetailSkeleton() {
  return (
    <Stack gap="spacer16">
      <Skeleton height={32} width="60%" />
      <Skeleton height={16} width="40%" />
      <Skeleton height={140} />
      <Skeleton height={180} />
      <Skeleton height={120} />
    </Stack>
  );
}

export default function OrderDetailScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { address, connect } = useWallet();
  const { currencySymbol } = useCurrency();
  const { back, replace, canGoBack } = useAppRouter();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const rawOrderId = params.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const supportsBuyerOrders = typeof chainAdapter.listOrdersByBuyer === 'function';

  const fetchOrder = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!address || !supportsBuyerOrders || !orderId) return;
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      setNotFound(false);
      try {
        const list = await chainAdapter.listOrdersByBuyer!(address);
        const match = list.find((item) => item.id === orderId);
        if (match) {
          setOrder(match);
          setNotFound(false);
        } else {
          setOrder(null);
          setNotFound(true);
        }
      } catch (err) {
        errorLog('Failed to load buyer order detail', err);
        setError(t('orders.detailLoadError', 'Unable to load this order. Please try again.'));
      } finally {
        if (mode === 'initial') {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [address, supportsBuyerOrders, orderId, t],
  );

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setError(null);
      setNotFound(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!address || !supportsBuyerOrders) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setOrder(null);
    fetchOrder('initial').catch(() => {});
  }, [orderId, address, supportsBuyerOrders, fetchOrder]);

  useEffect(() => {
    if (!orderId) return;
    try {
      const unsubscribe = ordersWarmCache.subscribe(
        (id) => id === orderId,
        (_id, value) => {
          if (!value) {
            setNotFound(true);
            return;
          }
          setOrder((prev) => {
            if (prev && prev.updatedAt === value.updatedAt) {
              return prev;
            }
            return value;
          });
          setNotFound(false);
        },
      );
      return () => unsubscribe?.();
    } catch (err) {
      errorLog('order detail warm cache subscribe failed', err);
      return undefined;
    }
  }, [orderId]);

  const createdAtLabel = useMemo(() => formatDateTime(order?.createdAt), [order?.createdAt]);
  const updatedAtLabel = useMemo(() => formatDateTime(order?.updatedAt), [order?.updatedAt]);

  const statusLabel = useMemo(() => {
    if (!order) return '—';
    switch (order.status) {
      case 'order_received':
        return t('orders.status.order_received', 'Order received');
      case 'courier_found':
        return t('orders.status.courier_found', 'Courier found');
      case 'courier_picked_up':
        return t('orders.status.courier_picked_up', 'Courier picked up');
      case 'courier_on_way':
        return t('orders.status.courier_on_way', 'Courier on the way');
      case 'delivered':
        return t('orders.status.delivered', 'Delivered');
      case 'disputed':
        return t('orders.status.disputed', 'Disputed');
      case 'released':
        return t('orders.status.released', 'Released');
      case 'refunded':
        return t('orders.status.refunded', 'Refunded');
      default:
        return order.status;
    }
  }, [order, t]);

  const paymentLabel = useMemo(() => {
    if (!order) return '—';
    switch (order.paymentMethod) {
      case 'cash_on_delivery':
        return t('orders.paymentMethod.cash_on_delivery', 'Cash on delivery');
      case 'near':
        return t('orders.paymentMethod.near', 'NEAR wallet');
      case 'card':
        return t('orders.paymentMethod.card', 'Card');
      default:
        return order.paymentMethod;
    }
  }, [order, t]);

  const handleTrack = useCallback(() => {
    Alert.alert(
      t('orders.detailTrackTitle', 'Order tracking'),
      t('orders.detailTrackMessage', 'Delivery tracking over Waku is coming soon.'),
    );
  }, [t]);

  const handleContactSupport = useCallback(() => {
    Alert.alert(
      t('orders.detailSupportTitle', 'Need help?'),
      t('orders.detailSupportMessage', 'Support chat is on the way.'),
    );
  }, [t]);

  const handleViewReceipt = useCallback(async () => {
    try {
      const publicKey = await getPublicKeyHex();
      if (!publicKey) {
        Alert.alert(
          t('orders.receiptUnavailableTitle', 'Receipt unavailable'),
          t('orders.receiptUnavailableMessage', 'Connect your wallet again to view the receipt.'),
        );
        return;
      }
      const receipt = await loadKycReceipt(publicKey);
      if (!receipt) {
        Alert.alert(
          t('orders.receiptMissingTitle', 'Receipt not found'),
          t('orders.receiptMissingMessage', 'We could not find a local receipt for this order.'),
        );
        return;
      }
      const issuedAt = formatDateTime(receipt.payload.issuedAt);
      const messageTemplate = t(
        'orders.receiptBody',
        'Receipt #{id}\nIssued {date}',
      );
      const message = messageTemplate
        .replace('{id}', receipt.payload.receiptId)
        .replace('{date}', issuedAt);
      Alert.alert(
        t('orders.receiptTitle', 'Order receipt'),
        message,
      );
    } catch (err) {
      errorLog('Failed to load receipt', err);
      Alert.alert(
        t('orders.receiptErrorTitle', 'Unable to load receipt'),
        t('orders.receiptErrorMessage', 'Please try again later.'),
      );
    }
  }, [t]);

  const handleBack = useCallback(() => {
    if (canGoBack()) {
      back();
    } else {
      replace('/orders');
    }
  }, [back, replace, canGoBack]);

  const handleRefresh = useCallback(() => {
    void fetchOrder('refresh');
  }, [fetchOrder]);

  if (!supportsBuyerOrders) {
    return (
      <ScrollArea backgroundColor={colors.canvas}>
        <Container>
          <Heading size="xl">{t('orders.detailHeading', 'Order details')}</Heading>
          <View style={{ height: 16 }} />
          <EmptyState
            icon={AlertTriangle}
            title={t('orders.unsupportedTitle', 'Orders unavailable')}
            message={t(
              'orders.unsupportedDescription',
              'Your current network does not expose buyer order history yet.',
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
          <Heading size="xl">{t('orders.detailHeading', 'Order details')}</Heading>
          <View style={{ height: 16 }} />
          <EmptyState
            icon={ShoppingCart}
            title={t('orders.detailConnectTitle', 'Connect to view this order')}
            message={t(
              'orders.detailConnectDescription',
              'Link your wallet to access your purchase history and delivery updates.',
            )}
            actionText={t('auth.login', 'Login')}
            onAction={connect}
          />
        </Container>
      </ScrollArea>
    );
  }

  if (!orderId) {
    return (
      <ScrollArea backgroundColor={colors.canvas}>
        <Container>
          <Heading size="xl">{t('orders.detailHeading', 'Order details')}</Heading>
          <View style={{ height: 16 }} />
          <EmptyState
            icon={AlertTriangle}
            title={t('orders.detailMissingTitle', 'Order not found')}
            message={t('orders.detailMissingMessage', 'We could not find that order.')}
            actionText={t('orders.detailBackAction', 'Back to orders')}
            onAction={handleBack}
          />
        </Container>
      </ScrollArea>
    );
  }

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={colors.gold}
    />
  );

  let content: React.ReactNode;

  if (loading && !order) {
    content = <OrderDetailSkeleton />;
  } else if (error) {
    content = (
      <EmptyState
        icon={RefreshCw}
        title={t('orders.detailErrorTitle', 'Something went wrong')}
        message={error}
        actionText={t('common.reload', 'Reload')}
        onAction={() => fetchOrder('initial')}
      />
    );
  } else if (notFound) {
    content = (
      <EmptyState
        icon={AlertTriangle}
        title={t('orders.detailMissingTitle', 'Order not found')}
        message={t('orders.detailMissingMessage', 'We could not find that order.')}
        actionText={t('orders.detailBackAction', 'Back to orders')}
        onAction={handleBack}
      />
    );
  } else if (!order) {
    content = <OrderDetailSkeleton />;
  } else {
    content = (
      <Stack gap="spacer16">
        <Stack gap="spacer4">
          <Heading size="xl" style={{ color: colors.text.primary }}>
            {t('orders.detailHeading', 'Order details')} #{order.id}
          </Heading>
          <Text style={{ color: colors.text.secondary }}>
            {t('orders.detailPlacedOn', 'Placed on')} {createdAtLabel}
          </Text>
        </Stack>

        <Card>
          <Stack gap="spacer12">
            <Heading size="md" style={{ color: colors.text.primary }}>
              {t('orders.detailStatusHeading', 'Status')}
            </Heading>
            <Text style={[styles.statusText, { color: colors.text.primary }]}>{statusLabel}</Text>
            <Text style={{ color: colors.text.secondary }}>
              {t('orders.detailUpdated', 'Last updated')}: {updatedAtLabel}
            </Text>
          </Stack>
        </Card>

        <Card>
          <OrderTimeline order={order} withBorder={false} style={{ padding: 0 }} />
        </Card>

        <Card>
          <Stack gap="spacer12">
            <Heading size="md" style={{ color: colors.text.primary }}>
              {t('orders.detailItemsHeading', 'Items')}
            </Heading>
            {order.items && order.items.length > 0 ? (
              <Stack gap="spacer12">
                {order.items.map((item) => {
                  const lineTotal = (item.unitPrice ?? item.product?.price ?? 0) * item.quantity;
                  return (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text
                          style={[styles.itemName, { color: colors.text.primary }]}
                          numberOfLines={2}
                        >
                          {item.product?.name || t('orders.itemFallbackName', 'Item')}
                        </Text>
                        {item.tierName ? (
                          <Text style={{ color: colors.text.secondary }}>
                            {t('orders.detailTierLabel', 'Tier')}: {item.tierName}
                          </Text>
                        ) : null}
                        <Text style={{ color: colors.text.secondary }}>
                          {t('orders.detailQuantityLabel', 'Quantity')}: {item.quantity}
                        </Text>
                      </View>
                      <Text style={[styles.itemPrice, { color: colors.text.primary }]}>
                        {currencySymbol}
                        {formatAmount(lineTotal)}
                      </Text>
                    </View>
                  );
                })}
              </Stack>
            ) : (
              <Text style={{ color: colors.text.secondary }}>
                {t('orders.detailNoItems', 'This order does not contain any items.')}
              </Text>
            )}
          </Stack>
        </Card>

        <Card>
          <Stack gap="spacer12">
            <Heading size="md" style={{ color: colors.text.primary }}>
              {t('orders.detailShippingHeading', 'Shipping')}
            </Heading>
            <Text style={{ color: colors.text.primary }}>{order.shippingAddress.name}</Text>
            <Text style={{ color: colors.text.secondary }}>{order.shippingAddress.phone}</Text>
            <Text style={{ color: colors.text.secondary }}>{order.shippingAddress.street}</Text>
            <Text style={{ color: colors.text.secondary }}>
              {order.shippingAddress.city} {order.shippingAddress.postalCode}
            </Text>
            {order.shippingAddress.notes ? (
              <Text style={{ color: colors.text.secondary }}>
                {t('orders.detailNotesLabel', 'Notes')}: {order.shippingAddress.notes}
              </Text>
            ) : null}
          </Stack>
        </Card>

        <Card>
          <Stack gap="spacer12">
            <Heading size="md" style={{ color: colors.text.primary }}>
              {t('orders.detailSummaryHeading', 'Summary')}
            </Heading>
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.text.secondary }}>
                {t('orders.detailTotalLabel', 'Total')}
              </Text>
              <Text style={[styles.totalText, { color: colors.text.primary }]}>
                {currencySymbol}
                {formatAmount(order.total)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.text.secondary }}>
                {t('orders.detailPaymentMethodLabel', 'Payment method')}
              </Text>
              <Text style={{ color: colors.text.primary }}>{paymentLabel}</Text>
            </View>
            {order.paymentTxHash ? (
              <View style={styles.summaryRow}>
                <Text style={{ color: colors.text.secondary }}>
                  {t('orders.detailTransactionLabel', 'Transaction')}
                </Text>
                <Text
                  style={[styles.hashText, { color: colors.text.primary }]}
                  numberOfLines={1}
                >
                  {order.paymentTxHash}
                </Text>
              </View>
            ) : null}
          </Stack>
        </Card>

        <Card>
          <Stack gap="spacer12">
            <Heading size="md" style={{ color: colors.text.primary }}>
              {t('orders.detailActionsHeading', 'Actions')}
            </Heading>
            <Stack gap="spacer12">
              <Button style={styles.fullWidthButton} onPress={handleTrack}>
                {t('orders.detailTrackAction', 'Track delivery')}
              </Button>
              <Button style={styles.fullWidthButton} onPress={handleContactSupport}>
                {t('orders.detailSupportAction', 'Contact support')}
              </Button>
              <Button style={styles.fullWidthButton} onPress={handleViewReceipt}>
                {t('orders.detailReceiptAction', 'View receipt')}
              </Button>
              <Button style={styles.fullWidthButton} onPress={handleBack}>
                {t('orders.detailBackAction', 'Back to orders')}
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    );
  }

  return (
    <ScrollArea
      backgroundColor={colors.canvas}
      refreshControl={refreshControl}
    >
      <Container>{content}</Container>
    </ScrollArea>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPrice: {
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  totalText: {
    fontWeight: '700',
  },
  hashText: {
    flexShrink: 1,
    textAlign: 'right',
  },
  fullWidthButton: {
    width: '100%',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 18,
  },
});
