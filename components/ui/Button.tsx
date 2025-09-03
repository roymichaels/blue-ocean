import React, { forwardRef } from 'react';
import { Pressable, ActivityIndicator, PressableProps } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, radius } from '@/shared/ui/tokens';
import Text from '@/shared/ui/Text';

interface ButtonProps extends PressableProps {
  title?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
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
      : variant === 'secondary'
        ? getColor('interactive.secondary')
        : 'transparent';

  const textColor = isDisabled
    ? getColor('text.secondary')
    : variant === 'primary'
      ? getColor('text.inverse')
      : variant === 'secondary'
        ? getColor('text.primary')
        : getColor('interactive.primary');

  const borderStyle =
    variant === 'secondary'
      ? {
          borderWidth: 1,
          borderColor: isDisabled
            ? getColor('interactive.disabled')
            : getColor('border.primary'),
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
        <Text variant="md" weight="600" style={{ color: textColor }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
},
);

export default Button;
