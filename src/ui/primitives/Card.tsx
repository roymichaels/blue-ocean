import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { radius, shadows, spacing } from '../tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function Card({ children, style }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface.primary,
          borderRadius: radius.lg,
          padding: spacing.spacer16,
          ...shadows.md.web,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default React.memo(Card);
