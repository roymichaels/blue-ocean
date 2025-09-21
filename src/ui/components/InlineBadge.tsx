import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface InlineBadgeProps {
  label: string;
  tone?: 'default' | 'success' | 'warning';
}

export function InlineBadge({ label, tone = 'default' }: InlineBadgeProps) {
  const { colors, typography, radius } = useTheme();
  const background =
    tone === 'success' ? 'rgba(34, 211, 238, 0.12)' : tone === 'warning' ? 'rgba(251, 191, 36, 0.16)' : colors.primaryMuted;
  const foreground = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.primary;
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: background,
          borderRadius: radius.full,
        },
      ]}
    >
      <Text style={{ color: foreground, fontSize: typography.small, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
