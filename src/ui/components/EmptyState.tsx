import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={{ color: colors.text, fontSize: typography.heading, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: colors.textMuted, fontSize: typography.body, textAlign: 'center' }}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
  },
});
