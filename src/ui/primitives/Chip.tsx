import React from 'react';
import { Pressable, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { radius, spacing, typography } from '../tokens';

interface ChipProps {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Chip({ label, onPress, style, textStyle }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[{
        borderRadius: radius.full,
        paddingHorizontal: spacing.spacer12,
        paddingVertical: spacing.spacer4,
        backgroundColor: colors.surface.primary,
        borderWidth: 1,
        borderColor: colors.border.primary,
      }, style]}
    >
      <Text style={[{ color: colors.text.primary, ...typography.sm }, textStyle]}>{label}</Text>
    </Pressable>
  );
}
