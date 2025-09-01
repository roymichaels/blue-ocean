import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  PressableProps,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps extends PressableProps {
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
  const { tokens } = useTheme();
  const { colors, spacing, radius } = tokens;

  const isDisabled = disabled || loading;

  const backgroundColor = isDisabled
    ? colors.interactive.disabled
    : variant === 'primary'
      ? colors.interactive.primary
      : colors.interactive.secondary;

  const textColor = isDisabled
    ? colors.text.secondary
    : variant === 'primary'
      ? colors.text.inverse
      : colors.text.primary;

  const borderStyle =
    variant === 'secondary'
      ? {
          borderWidth: 1,
          borderColor: isDisabled ? colors.interactive.disabled : colors.border.primary,
        }
      : null;

  const buttonStyle = {
    paddingVertical: spacing.spacer12,
    paddingHorizontal: spacing.spacer16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      style={[buttonStyle, { backgroundColor }, borderStyle, style]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : children ? (
        children
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

