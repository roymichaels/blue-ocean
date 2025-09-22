import React from 'react';
import { View, StyleProp, ViewStyle, ViewProps } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { radius, shadows, spacing } from '../tokens';

type BaseViewProps = Omit<ViewProps, 'accessibilityRole'>;

interface CardProps extends BaseViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: ViewProps['accessibilityRole'] | 'dialog';
}

export default function Card({
  children,
  style,
  accessibilityRole,
  ...rest
}: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole={accessibilityRole as ViewProps['accessibilityRole']}
      {...rest}
      style={[
        {
          backgroundColor: colors.surface.primary,
          borderRadius: radius.lg,
          padding: spacing.spacer16,
          borderWidth: 1,
          borderColor: colors.border.primary,
          ...shadows.md.web,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
