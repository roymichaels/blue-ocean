import React, { forwardRef, useRef } from 'react';
import {
  Pressable,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
  PressableProps,
  PressableStateCallbackType,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from '../ThemeProvider';
import { spacing, radius, typography } from '../tokens';
import Spinner from './Spinner';
import useReducedMotion from '@/shared/hooks/useReducedMotion';

interface ButtonProps extends PressableProps {
  title?: string;
  textStyle?: StyleProp<TextStyle>;
  loading?: boolean;
  children?: React.ReactNode;
  tooltip?: string;
  onKeyDown?: (e: any) => void;
}

const Button = forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      title,
      disabled,
      style,
      textStyle,
      loading = false,
      children,
      tooltip,
      ...rest
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const scale = useRef(new Animated.Value(1)).current;
    const reduceMotion = useReducedMotion();

    const handlePressIn = () => {
      if (reduceMotion) return;
      Animated.spring(scale, {
        toValue: 0.97,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      if (reduceMotion) return;
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    const isDisabled = disabled || loading;
    const combinedStyle = (state: PressableStateCallbackType) => {
      const base = [
        styles.button(colors),
        state.pressed && styles.pressed,
        (state as any).focused && styles.focused(colors),
        isDisabled && styles.disabled,
      ];
      if (typeof style === 'function') {
        base.push(style(state));
      } else if (style) {
        base.push(style as any);
      }
      return base;
    };

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          ref={ref}
          disabled={isDisabled}
          style={combinedStyle}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          {...(Platform.OS === 'web' && tooltip ? { title: tooltip } : {})}
          {...rest}
        >
          {loading ? (
            <Spinner color={colors.text.inverse} />
          ) : children ? (
            children
          ) : (
            <Text style={[styles.label(colors), textStyle]}>{title}</Text>
          )}
        </Pressable>
      </Animated.View>
    );
  },
);

Button.displayName = 'Button';

export default Button;

const styles = {
  button: (colors: any): ViewStyle => ({
    backgroundColor: colors.interactive.primary,
    paddingVertical: spacing.spacer12,
    paddingHorizontal: spacing.spacer16,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  }),
  label: (colors: any) => ({
    ...typography.md,
    color: colors.text.inverse,
  }),
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9 },
  focused: (colors: any): ViewStyle => ({
    borderColor: colors.border.focus,
  }),
};
