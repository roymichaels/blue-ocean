import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps } from 'react-native';
import { useTheme } from '../ThemeProvider';

export default function Spinner({ color, ...props }: ActivityIndicatorProps) {
  const { colors } = useTheme();
  return <ActivityIndicator color={color || colors.gold} {...props} />;
}
