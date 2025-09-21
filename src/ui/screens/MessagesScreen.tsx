import React from 'react';
import { FlatList, View } from 'react-native';
import { Screen } from '@/ui/layout/Screen';
import { useMessages } from '@/logic/hooks/useMessages';
import { Skeleton } from '@/ui/components/Skeleton';
import { EmptyState } from '@/ui/components/EmptyState';
import { MessageThreadCard } from '@/ui/components/MessageThreadCard';
import { useTheme } from '@/ui/theme/ThemeProvider';

export default function MessagesScreen() {
  const { data, status, refresh, error } = useMessages();
  const { spacing } = useTheme();

  if (status === 'loading' && !data) {
    return (
      <Screen scrollable>
        <Skeleton height={120} />
        <Skeleton height={120} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scrollable>
        <EmptyState title="Messages unavailable" description={error.message} />
      </Screen>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Screen scrollable>
        <EmptyState title="No conversations yet" description="Reach out to a store to start planning your next order." />
      </Screen>
    );
  }

  return (
    <Screen padded={false} scrollable={false}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageThreadCard message={item} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
        refreshing={status === 'loading'}
        onRefresh={refresh}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </Screen>
  );
}
