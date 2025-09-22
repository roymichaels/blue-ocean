import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Order } from '@/data/commerce';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { Card } from './Card';
import { InlineBadge } from './InlineBadge';
import { formatOrderTimestamp } from '@/logic/utils/date';

const statusLabels: Record<Order['status'], { label: string; tone: 'default' | 'success' | 'warning' }> = {
  processing: { label: 'In progress', tone: 'warning' },
  ready: { label: 'Ready for pickup', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'default' },
};

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const { colors, typography } = useTheme();
  const status = statusLabels[order.status];
  return (
    <Card accessibilityLabel={`View order ${order.id}`}>
      <View style={styles.header}>
        <Text style={{ color: colors.text, fontSize: typography.body, fontWeight: '600' }}>{order.id}</Text>
        <InlineBadge label={status.label} tone={status.tone} />
      </View>
      <Text style={{ color: colors.muted, fontSize: typography.small }}>
        Placed {formatOrderTimestamp(order.placedAt)}
      </Text>
      <View style={{ gap: 6 }}>
        {order.items.map((item) => (
          <Text key={item.productId} style={{ color: colors.textMuted, fontSize: typography.body }}>
            {item.quantity} × {item.name}
          </Text>
        ))}
      </View>
      <Text style={{ color: colors.text, fontWeight: '600', fontSize: typography.body }}>
        Total ${order.total.amount.toFixed(2)} {order.total.currency}
      </Text>
      {order.fulfillmentEtaMinutes ? (
        <Text style={{ color: colors.muted, fontSize: typography.small }}>
          ETA ~{order.fulfillmentEtaMinutes} min
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
