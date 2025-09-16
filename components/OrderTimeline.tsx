import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { CheckCircle, Circle } from 'lucide-react-native';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { formatTimestamp } from '@/utils/formatTimestamp';
import type { Order, OrderStatus } from '@/types';
import { buildTimelineEntries } from '@/features/orders/orderTimeline';

interface OrderTimelineProps {
  order: Order;
  withBorder?: boolean;
  style?: StyleProp<ViewStyle>;
}

const STATUS_TRANSLATIONS: Record<OrderStatus, { title: string; description: string }> = {
  order_received: {
    title: 'orders.timeline.order_received.title',
    description: 'orders.timeline.order_received.description',
  },
  courier_found: {
    title: 'orders.timeline.courier_found.title',
    description: 'orders.timeline.courier_found.description',
  },
  courier_picked_up: {
    title: 'orders.timeline.courier_picked_up.title',
    description: 'orders.timeline.courier_picked_up.description',
  },
  courier_on_way: {
    title: 'orders.timeline.courier_on_way.title',
    description: 'orders.timeline.courier_on_way.description',
  },
  delivered: {
    title: 'orders.timeline.delivered.title',
    description: 'orders.timeline.delivered.description',
  },
  released: {
    title: 'orders.timeline.released.title',
    description: 'orders.timeline.released.description',
  },
  refunded: {
    title: 'orders.timeline.refunded.title',
    description: 'orders.timeline.refunded.description',
  },
  disputed: {
    title: 'orders.timeline.disputed.title',
    description: 'orders.timeline.disputed.description',
  },
};

export default function OrderTimeline({ order, withBorder = true, style }: OrderTimelineProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const entries = useMemo(() => buildTimelineEntries(order), [order]);

  return (
    <View
      style={[
        styles.container,
        withBorder && { borderColor: colors.border.primary, borderWidth: 1 },
        style,
      ]}
    >
      {entries.map((entry, index) => {
        const translation = STATUS_TRANSLATIONS[entry.status];
        const title = translation
          ? t(translation.title, translation.title)
          : entry.status;
        const description = translation
          ? t(translation.description, translation.description)
          : '';
        const timestampLabel = entry.timestamp
          ? formatTimestamp(entry.timestamp)
          : t('orders.timeline.pending', 'Pending');
        const IconComponent = entry.completed ? CheckCircle : Circle;
        const iconColor = entry.completed ? colors.gold : colors.interactive.disabled;
        const textColor = entry.completed ? colors.text.primary : colors.text.secondary;
        const secondaryColor = entry.completed ? colors.text.secondary : colors.text.tertiary;
        return (
          <View
            key={`${entry.status}-${index}`}
            style={[styles.row, index === entries.length - 1 ? styles.rowLast : null]}
          >
            <View style={styles.iconColumn}>
              <IconComponent size={20} color={iconColor} />
              {index < entries.length - 1 ? (
                <View style={[styles.connector, { backgroundColor: colors.border.secondary }]} />
              ) : null}
            </View>
            <View style={styles.contentColumn}>
              <Text
                style={[
                  styles.title,
                  { color: textColor },
                  entry.isCurrent && { color: colors.gold },
                ]}
              >
                {title}
              </Text>
              {description ? (
                <Text style={[styles.description, { color: secondaryColor }]}>{description}</Text>
              ) : null}
              <Text style={[styles.timestamp, { color: colors.text.tertiary }]}>
                {timestampLabel}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowLast: {
    paddingBottom: 0,
  },
  iconColumn: {
    alignItems: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  contentColumn: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
});

