import React from 'react';
import { Text as RNText, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { typography } from '../tokens';

interface HeadingProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export default function Heading({ children, style }: HeadingProps) {
  const { colors } = useTheme();
  return <RNText style={[{ color: colors.text.primary, ...typography.xl }, style]}>{children}</RNText>;
}
