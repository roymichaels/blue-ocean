import React, { forwardRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  PressableProps,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radius } from '@/shared/ui/tokens';

interface ButtonProps extends PressableProps {
  title?: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

const Button = forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      title,
      variant = 'primary',
      loading = false,
      style,
      disabled,
      children,
      accessibilityRole = 'button',
      ...rest
    },
    ref,
  ) => {
  const { getColor } = useTheme();

  const isDisabled = disabled || loading;

  const backgroundColor = isDisabled
    ? getColor('interactive.disabled')
    : variant === 'primary'
      ? getColor('interactive.primary')
      : getColor('interactive.secondary');

  const textColor = isDisabled
    ? getColor('text.secondary')
    : variant === 'primary'
      ? getColor('text.inverse')
      : getColor('text.primary');

  const borderStyle =
    variant === 'secondary'
      ? {
          borderWidth: 1,
          borderColor: isDisabled ? getColor('interactive.disabled') : getColor('border.primary'),
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
      ref={ref}
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
},
);

export default Button;

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

