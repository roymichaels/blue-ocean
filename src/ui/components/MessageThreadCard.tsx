import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MessagePreview } from '@/data/commerce';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { Card } from './Card';
import { InlineBadge } from './InlineBadge';
import { formatRelativeTime } from '@/logic/formatters/date';

interface MessageThreadCardProps {
  message: MessagePreview;
}

export function MessageThreadCard({ message }: MessageThreadCardProps) {
  const { colors, typography } = useTheme();
  return (
    <Card accessibilityLabel={`Open messages with ${message.storeName}`}>
      <View style={styles.header}>
        <Text style={{ color: colors.text, fontSize: typography.body, fontWeight: '600' }}>{message.storeName}</Text>
        <Text style={{ color: colors.muted, fontSize: typography.small }}>{formatRelativeTime(message.updatedAt)}</Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: typography.body }} numberOfLines={2}>
        {message.lastMessage}
      </Text>
      {message.unreadCount > 0 ? (
        <InlineBadge label={`${message.unreadCount} unread`} tone="warning" />
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
