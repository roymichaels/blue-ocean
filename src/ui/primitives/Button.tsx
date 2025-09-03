import React from 'react';
import {
  Pressable,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
  PressableProps,
  ActivityIndicator,
  PressableStateCallbackType,
} from 'react-native';
import { useTheme } from '../ThemeProvider';
import { spacing, radius, typography } from '../tokens';

interface ButtonProps extends PressableProps {
  title?: string;
  textStyle?: StyleProp<TextStyle>;
  loading?: boolean;
  children?: React.ReactNode;
}

export default function Button({
  title,
  disabled,
  style,
  textStyle,
  loading = false,
  children,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const combinedStyle =
    typeof style === 'function'
      ? (state: PressableStateCallbackType) => [
          styles.button(colors),
          isDisabled && styles.disabled,
          style(state),
        ]
      : [styles.button(colors), isDisabled && styles.disabled, style];

  return (
    <Pressable
      disabled={isDisabled}
      style={combinedStyle}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.inverse} />
      ) : children ? (
        children
      ) : (
        <Text style={[styles.label(colors), textStyle]}>{title}</Text>
      )}
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
