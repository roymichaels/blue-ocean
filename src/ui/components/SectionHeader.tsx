import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text, fontSize: typography.heading }]}>{title}</Text>
      {actionLabel ? (
        <Text
          accessibilityRole="button"
          onPress={onActionPress}
          style={[styles.action, { color: colors.primary }]}
        >
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: '600',
  },
  action: {
    fontWeight: '600',
  },
});
