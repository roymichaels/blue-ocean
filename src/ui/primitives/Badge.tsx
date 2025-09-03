import React from 'react';
import { View, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { radius, spacing, typography } from '../tokens';

interface BadgeProps {
  label: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Badge({ label, style, textStyle }: BadgeProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[{
        backgroundColor: colors.interactive.primary,
        borderRadius: radius.full,
        paddingHorizontal: spacing.spacer8,
        paddingVertical: spacing.spacer4,
      }, style]}
    >
      <Text style={[{ color: colors.text.inverse, ...typography.sm }, textStyle]}>{label}</Text>
    </View>
  );
}
