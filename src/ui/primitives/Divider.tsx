import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { spacing } from '../tokens';

interface DividerProps {
  style?: StyleProp<ViewStyle>;
}

export default function Divider({ style }: DividerProps) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border.primary, marginVertical: spacing.spacer8 }, style]} />;
}
