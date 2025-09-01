import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radius } from '../../constants/tokens';

interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export default function Button({
  title,
  variant = 'primary',
  loading = false,
  style,
  disabled,
  children,
  accessibilityRole = 'button',
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();

  const backgroundColor =
    variant === 'primary' ? colors.interactive.primary : colors.interactive.secondary;
  const textColor = variant === 'primary' ? colors.text.inverse : colors.text.primary;
  const borderStyle =
    variant === 'secondary'
      ? { borderWidth: 1, borderColor: colors.border.primary }
      : null;

  return (
    <TouchableOpacity
      accessibilityRole={accessibilityRole}
      style={[styles.button, { backgroundColor }, borderStyle, style]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : children ? (
        children
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.spacer12,
    paddingHorizontal: spacing.spacer16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

