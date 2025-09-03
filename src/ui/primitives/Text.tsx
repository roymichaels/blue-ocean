import React from 'react';
import { Text as RNText, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { typography } from '../tokens';

interface TextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export default function Text({ children, style }: TextProps) {
  const { colors } = useTheme();
  return <RNText style={[{ color: colors.text.primary, ...typography.md }, style]}>{children}</RNText>;
}
