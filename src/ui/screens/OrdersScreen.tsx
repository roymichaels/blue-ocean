import React from 'react';
import { FlatList, View } from 'react-native';
import { Screen } from '@/ui/layout/Screen';
import { useOrders } from '@/logic/hooks/useOrders';
import { Skeleton } from '@/ui/components/Skeleton';
import { EmptyState } from '@/ui/components/EmptyState';
import { OrderCard } from '@/ui/components/OrderCard';
import { useTheme } from '@/ui/theme/ThemeProvider';

export default function OrdersScreen() {
  const { data, status, refresh, error } = useOrders();
  const { spacing } = useTheme();

  if (status === 'loading' && !data) {
    return (
      <Screen scrollable>
        <Skeleton height={140} />
        <Skeleton height={140} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scrollable>
        <EmptyState title="Orders unavailable" description={error.message} />
      </Screen>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Screen scrollable>
        <EmptyState title="No orders yet" description="Discover a store and place your first order." />
      </Screen>
    );
  }

  return (
    <Screen padded={false} scrollable={false}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
        refreshing={status === 'loading'}
        onRefresh={refresh}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </Screen>
  );
}
