import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { spacing, typography } from '../tokens';

interface LabelProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export default function Label({ children, style }: LabelProps) {
  const { colors } = useTheme();
  return (
    <Text style={[{ color: colors.text.secondary, marginBottom: spacing.spacer4, ...typography.sm }, style]}>
      {children}
    </Text>
  );
}
