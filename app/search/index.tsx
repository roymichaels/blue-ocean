import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import { Heading, Text, TextField, Divider } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { spacing, radius, typography } from '@/ui/tokens';
import { useTenant } from '@/contexts/TenantContext';
import { useProducts, useStores } from '@/services';
import { useWallet } from '@/contexts/WalletProvider';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAppRouter } from '@/services/useAppRouter';
import search, {
  type SearchDomain,
  type SearchResult,
  type ProductFilters,
  type StoreFilters,
  type OrderFilters,
  type MessageFilters,
} from '@/services/search';
import { ordersWarmCache } from '@/services/nearOrders';
import DatabaseService from '@/services/database';
import { errorLog } from '@/utils/logger';
import EmptyState from '@/shared/ui/EmptyState';
import type { Order, OrderStatus } from '@/types';
import {
  Package,
  Store as StoreIcon,
  Receipt,
  MessageSquare,
  Search as SearchIcon,
  Filter as FilterIcon,
} from 'lucide-react-native';

interface ThreadOption {
  id: string;
  label: string;
}

const DEFAULT_STORE_ID = 'default';

function normalizeAddress(value?: string | null): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function orderMatchesBuyer(order: Order | undefined, buyer: string): boolean {
  if (!order || !buyer) return false;
  const buyerAddress = normalizeAddress(order.buyerAddress);
  const userId = normalizeAddress(order.userId);
  return buyerAddress === buyer || userId === buyer;
}

function formatDateLabel(value?: string | number | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export default function GlobalSearchScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { tenantId } = useTenant();
  const storeId = tenantId ?? DEFAULT_STORE_ID;
  const { data: products = [] } = useProducts(storeId);
  const { data: stores = [] } = useStores(DEFAULT_STORE_ID);
  const { address } = useWallet();
  const { currencySymbol } = useCurrency();
  const { push } = useAppRouter();

  const [buyerOrders, setBuyerOrders] = useState<Order[]>([]);
  const [messageThreads, setMessageThreads] = useState<ThreadOption[]>([]);
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState<SearchDomain>('products');
  const [productFilters, setProductFilters] = useState<ProductFilters>({ category: null, inStockOnly: false });
  const [storeFilters, setStoreFilters] = useState<StoreFilters>({ plan: null });
  const [orderFilters, setOrderFilters] = useState<OrderFilters>({ status: null });
  const [messageFilters, setMessageFilters] = useState<MessageFilters>({ threadId: null });
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    search.index({ products });
  }, [products]);

  useEffect(() => {
    search.index({ stores });
  }, [stores]);

  useEffect(() => {
    let active = true;
    const normalized = normalizeAddress(address);
    if (!normalized) {
      setBuyerOrders([]);
      search.index({ orders: [] });
      return undefined;
    }

    const load = () => {
      try {
        const list = ordersWarmCache.list((_, value) => orderMatchesBuyer(value, normalized));
        if (!active) return;
        setBuyerOrders(list);
        search.index({ orders: list });
      } catch (err) {
        if (!active) return;
        errorLog('global search orders index failed', err);
        setBuyerOrders([]);
        search.index({ orders: [] });
      }
    };

    load();
    const unsubscribe = ordersWarmCache.subscribe(
      (_, value) => orderMatchesBuyer(value, normalized),
      () => load(),
    );

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [address]);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      try {
        const db = DatabaseService.getInstance();
        const rooms = await db.getChatRooms();
        const payload = await Promise.all(
          rooms.map(async (room) => ({
            room,
            messages: await db.getChatMessages(room.id),
          })),
        );
        if (cancelled) return;
        setMessageThreads(
          rooms.map((room) => ({
            id: room.id,
            label: room.userName || room.id,
          })),
        );
        search.index({ messages: payload });
      } catch (err) {
        if (cancelled) return;
        errorLog('global search message index failed', err);
        setMessageThreads([]);
        search.index({ messages: [] });
      }
    };

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = useMemo(
    () => [
      { id: 'products' as const, label: t('search.tabs.products', 'Products'), icon: Package },
      { id: 'stores' as const, label: t('search.tabs.stores', 'Stores'), icon: StoreIcon },
      { id: 'orders' as const, label: t('search.tabs.orders', 'My Orders'), icon: Receipt },
      { id: 'messages' as const, label: t('search.tabs.messages', 'Messages'), icon: MessageSquare },
    ],
    [t],
  );

  const productCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((product) => {
      if (product.category) set.add(product.category);
    });
    return Array.from(set);
  }, [products]);

  const storePlanOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((store) => {
      if (store.plan) set.add(store.plan);
    });
    return Array.from(set);
  }, [stores]);

  const orderStatuses = useMemo(() => {
    const set = new Set<OrderStatus>();
    buyerOrders.forEach((order) => {
      set.add(order.status);
    });
    return Array.from(set);
  }, [buyerOrders]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let filters: ProductFilters | StoreFilters | OrderFilters | MessageFilters | undefined;
      if (domain === 'products') filters = productFilters;
      if (domain === 'stores') filters = storeFilters;
      if (domain === 'orders') filters = orderFilters;
      if (domain === 'messages') filters = messageFilters;
      const next = search.query(query, { domain, filters });
      setResults(next);
    }, 75);
    return () => clearTimeout(timeout);
  }, [
    query,
    domain,
    productFilters,
    storeFilters,
    orderFilters,
    messageFilters,
    products,
    stores,
    buyerOrders,
    messageThreads,
  ]);

  const handleResultPress = useCallback(
    (item: SearchResult) => {
      if (item.params) {
        push({ pathname: item.route, params: item.params });
      } else {
        push(item.route);
      }
    },
    [push],
  );

  const orderStatusLabel = useCallback(
    (status: string) => {
      switch (status) {
        case 'order_received':
          return t('search.orderStatus.order_received', 'Order received');
        case 'courier_found':
          return t('search.orderStatus.courier_found', 'Courier found');
        case 'courier_picked_up':
          return t('search.orderStatus.courier_picked_up', 'Courier picked up');
        case 'courier_on_way':
          return t('search.orderStatus.courier_on_way', 'Courier on the way');
        case 'delivered':
          return t('search.orderStatus.delivered', 'Delivered');
        case 'disputed':
          return t('search.orderStatus.disputed', 'Disputed');
        case 'released':
          return t('search.orderStatus.released', 'Released');
        case 'refunded':
          return t('search.orderStatus.refunded', 'Refunded');
        default:
          return status;
      }
    },
    [t],
  );

  const renderMetadata = useCallback(
    (item: SearchResult) => {
      if (item.domain === 'products') {
        const price = item.metadata?.price;
        const category = item.metadata?.category as string | undefined;
        const parts: string[] = [];
        if (category) parts.push(category);
        if (typeof price === 'number' && price > 0) {
          parts.push(`${currencySymbol}${price.toFixed(2)}`);
        }
        return parts.join(' • ');
      }
      if (item.domain === 'stores') {
        const plan = item.metadata?.plan as string | undefined;
        const reputation = item.metadata?.reputation as number | undefined;
        const planLabel = plan
          ? plan === 'premium'
            ? t('common.premium', 'Premium')
            : t('common.free', 'Free')
          : null;
        const parts: string[] = [];
        if (planLabel) parts.push(planLabel);
        if (typeof reputation === 'number' && reputation >= 0) {
          parts.push(`${t('search.reputation', 'Reputation')}: ${reputation.toFixed(2)}`);
        }
        return parts.join(' • ');
      }
      if (item.domain === 'orders') {
        const status = item.metadata?.status as string | undefined;
        const created = formatDateLabel(item.metadata?.createdAt as string | undefined);
        const parts: string[] = [];
        if (status) parts.push(orderStatusLabel(status));
        if (created) parts.push(created);
        return parts.join(' • ');
      }
      if (item.domain === 'messages') {
        const sender = item.metadata?.sender as string | undefined;
        const timestamp = item.metadata?.timestamp as number | undefined;
        const parts: string[] = [];
        if (sender) parts.push(sender);
        if (typeof timestamp === 'number') {
          const label = formatDateLabel(timestamp);
          if (label) parts.push(label);
        }
        return parts.join(' • ');
      }
      return '';
    },
    [currencySymbol, orderStatusLabel, t],
  );

  const planLabel = useCallback(
    (plan: string | null | undefined) => {
      if (!plan || plan === 'all') return t('search.filters.all', 'All');
      if (plan === 'premium') return t('common.premium', 'Premium');
      if (plan === 'free') return t('common.free', 'Free');
      return plan;
    },
    [t],
  );

  const renderFilters = () => {
    if (domain === 'products') {
      return (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <FilterIcon
              size={16}
              color={colors.text.secondary}
              style={{ marginEnd: spacing.spacer8 }}
            />
            <Text style={[styles.filterHeading, { color: colors.text.secondary }]}>
              {t('search.filters.category', 'Categories')}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <FilterPill
              label={t('search.filters.all', 'All')}
              active={!productFilters.category}
              onPress={() =>
                setProductFilters((prev) => ({ ...prev, category: null }))
              }
              testID="search-filter-products-all"
            />
            {productCategories.map((category) => (
              <FilterPill
                key={category}
                label={category}
                active={productFilters.category === category}
                onPress={() =>
                  setProductFilters((prev) => ({
                    ...prev,
                    category: prev.category === category ? null : category,
                  }))
                }
                testID={`search-filter-products-category-${category}`}
              />
            ))}
          </ScrollView>
          <View style={styles.filterRow}>
            <FilterPill
              label={t('search.filters.inStock', 'In stock only')}
              active={productFilters.inStockOnly ?? false}
              onPress={() =>
                setProductFilters((prev) => ({
                  ...prev,
                  inStockOnly: !prev.inStockOnly,
                }))
              }
              testID="search-filter-products-instock"
            />
          </View>
        </View>
      );
    }

    if (domain === 'stores') {
      return (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <FilterIcon
              size={16}
              color={colors.text.secondary}
              style={{ marginEnd: spacing.spacer8 }}
            />
            <Text style={[styles.filterHeading, { color: colors.text.secondary }]}>
              {t('search.filters.plan', 'Plan')}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <FilterPill
              label={t('search.filters.all', 'All')}
              active={!storeFilters.plan || storeFilters.plan === 'all'}
              onPress={() => setStoreFilters({ plan: null })}
              testID="search-filter-stores-all"
            />
            {storePlanOptions.map((plan) => (
              <FilterPill
                key={plan}
                label={planLabel(plan)}
                active={storeFilters.plan === plan}
                onPress={() =>
                  setStoreFilters((prev) => ({
                    plan: prev.plan === plan ? null : plan,
                  }))
                }
                testID={`search-filter-stores-plan-${plan}`}
              />
            ))}
          </ScrollView>
        </View>
      );
    }

    if (domain === 'orders') {
      return (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <FilterIcon
              size={16}
              color={colors.text.secondary}
              style={{ marginEnd: spacing.spacer8 }}
            />
            <Text style={[styles.filterHeading, { color: colors.text.secondary }]}>
              {t('search.filters.status', 'Status')}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <FilterPill
              label={t('search.filters.all', 'All')}
              active={!orderFilters.status}
              onPress={() => setOrderFilters({ status: null })}
              testID="search-filter-orders-all"
            />
            <FilterPill
              label={t('search.filters.open', 'Open')}
              active={orderFilters.status === 'open'}
              onPress={() =>
                setOrderFilters((prev) => ({
                  status: prev.status === 'open' ? null : 'open',
                }))
              }
              testID="search-filter-orders-open"
            />
            {orderStatuses.map((status) => (
              <FilterPill
                key={status}
                label={orderStatusLabel(status)}
                active={orderFilters.status === status}
                onPress={() =>
                  setOrderFilters((prev) => ({
                    status: prev.status === status ? null : status,
                  }))
                }
                testID={`search-filter-orders-status-${status}`}
              />
            ))}
          </ScrollView>
        </View>
      );
    }

    const threads = messageThreads;
    return (
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <FilterIcon
            size={16}
            color={colors.text.secondary}
            style={{ marginEnd: spacing.spacer8 }}
          />
          <Text style={[styles.filterHeading, { color: colors.text.secondary }]}>
            {t('search.filters.thread', 'Threads')}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <FilterPill
            label={t('search.filters.all', 'All')}
            active={!messageFilters.threadId}
            onPress={() => setMessageFilters({ threadId: null })}
            testID="search-filter-messages-all"
          />
          {threads.map((thread) => (
            <FilterPill
              key={thread.id}
              label={thread.label}
              active={messageFilters.threadId === thread.id}
              onPress={() =>
                setMessageFilters((prev) => ({
                  threadId: prev.threadId === thread.id ? null : thread.id,
                }))
              }
              testID={`search-filter-messages-thread-${thread.id}`}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderResults = () => {
    if (results.length === 0) {
      return (
        <EmptyState
          icon={SearchIcon}
          title={query.trim() ? t('search.empty.noResults', 'No matches found') : t('search.empty.noQuery', 'Start typing to search your marketplace.')}
          message={query.trim() ? t('search.empty.tryAgain', 'Try another phrase or adjust your filters.') : undefined}
        />
      );
    }

    return results.map((item) => (
      <Pressable
        key={`${item.domain}-${item.id}`}
        style={[
          styles.resultRow,
          {
            borderColor: colors.border.primary,
            backgroundColor: colors.surface.primary,
          },
        ]}
        onPress={() => handleResultPress(item)}
        testID={`search-result-${item.domain}-${item.id}`}
      >
        <Text style={[styles.resultTitle, { color: colors.text.primary }]}>{item.title}</Text>
        {item.subtitle ? (
          <Text
            style={[styles.resultSubtitle, { color: colors.text.secondary }]}
            numberOfLines={2}
          >
            {item.subtitle}
          </Text>
        ) : null}
        <Text style={[styles.resultMeta, { color: colors.text.tertiary }]}>
          {renderMetadata(item)}
        </Text>
      </Pressable>
    ));
  };

  return (
    <ScrollArea
      backgroundColor={colors.canvas}
      contentContainerStyle={{ flexGrow: 1 }}
      testID="global-search-screen"
    >
      <Container style={{ paddingVertical: spacing.spacer16 }}>
        <Stack gap="spacer16">
          <Heading size="xl" style={{ color: colors.text.primary }}>
            {t('search.title', 'Universal search')}
          </Heading>
          <TextField
            variant="search"
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder', 'Search products, stores, orders, and messages')}
            style={styles.searchField}
            textAlign={isRTL ? 'right' : 'left'}
            autoFocus
          />
          <View
            style={[styles.tabRow, { borderColor: colors.border.primary }]}
            accessibilityRole="tablist"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = domain === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setDomain(tab.id)}
                  style={[
                    styles.tabButton,
                    {
                      backgroundColor: active ? colors.surface.primary : 'transparent',
                      borderColor: active ? colors.border.focus : 'transparent',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  testID={`search-tab-${tab.id}`}
                >
                  <Icon size={16} color={active ? colors.text.primary : colors.text.secondary} />
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: active ? colors.text.primary : colors.text.secondary,
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {renderFilters()}
          <Divider style={{ marginVertical: spacing.spacer8 }} />
          <Stack gap="spacer12">{renderResults()}</Stack>
        </Stack>
      </Container>
    </ScrollArea>
  );
}

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}

function FilterPill({ label, active, onPress, testID }: FilterPillProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterPill,
        {
          backgroundColor: active ? colors.surface.primary : 'transparent',
          borderColor: active ? colors.border.focus : colors.border.primary,
        },
      ]}
      testID={testID}
    >
      <Text
        style={[
          styles.filterPillLabel,
          {
            color: active ? colors.text.primary : colors.text.secondary,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchField: {
    marginTop: spacing.spacer8,
  },
  tabRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.spacer12,
    paddingHorizontal: spacing.spacer8,
    borderWidth: 1,
  },
  tabLabel: {
    ...typography.sm,
    marginLeft: spacing.spacer8,
    marginRight: spacing.spacer8,
  },
  filterSection: {
    marginTop: spacing.spacer8,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.spacer8,
  },
  filterHeading: {
    ...typography.sm,
    fontWeight: '600',
  },
  filterScroll: {
    paddingVertical: spacing.spacer4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterPill: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingVertical: spacing.spacer8,
    paddingHorizontal: spacing.spacer12,
    marginRight: spacing.spacer8,
    marginBottom: spacing.spacer8,
  },
  filterPillLabel: {
    ...typography.sm,
  },
  resultRow: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.spacer16,
  },
  resultTitle: {
    ...typography.md,
    fontWeight: '600',
    marginBottom: spacing.spacer4,
  },
  resultSubtitle: {
    ...typography.sm,
    marginBottom: spacing.spacer4,
  },
  resultMeta: {
    ...typography.xs,
  },
});

