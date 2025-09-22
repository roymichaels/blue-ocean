import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { spacing, typography } from '../tokens';

interface HelperTextProps {
  children: React.ReactNode;
  error?: boolean;
  style?: StyleProp<TextStyle>;
}

export default function HelperText({ children, error, style }: HelperTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        { marginTop: spacing.spacer4, ...typography.xs, color: error ? colors.status.error : colors.text.secondary },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
