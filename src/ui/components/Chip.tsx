import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/ui/theme/ThemeProvider';

interface ChipProps {
  label: string;
}

export function Chip({ label }: ChipProps) {
  const { colors, radius, typography } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primaryMuted,
          borderColor: colors.primary,
          borderRadius: radius.full,
        },
      ]}
    >
      <Text style={{ color: colors.primary, fontSize: typography.small, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
});
