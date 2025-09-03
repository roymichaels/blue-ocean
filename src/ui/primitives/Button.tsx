import React from 'react';
import { Pressable, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { spacing, radius, typography } from '../tokens';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Button({ title, onPress, disabled, style, textStyle }: ButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.button(colors), disabled && styles.disabled, style]}
    >
      <Text style={[styles.label(colors), textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = {
  button: (colors: any): ViewStyle => ({
    backgroundColor: colors.interactive.primary,
    paddingVertical: spacing.spacer12,
    paddingHorizontal: spacing.spacer16,
    borderRadius: radius.md,
    alignItems: 'center',
  }),
  label: (colors: any) => ({
    ...typography.md,
    color: colors.text.inverse,
  }),
  disabled: { opacity: 0.5 },
};
