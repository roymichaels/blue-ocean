import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { radius, shadows } from '../constants/tokens';

interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: number;
  Component?: React.ComponentType<any>;
  [key: string]: any;
}

function getBoxShadow(elevation: number) {
  switch (elevation) {
    case 5:
      return '0px 4px 12px rgba(0, 0, 0, 0.15)';
    case 8:
      return '0px 4px 8px rgba(0, 0, 0, 0.3)';
    case 12:
      return '0px 8px 16px rgba(0, 0, 0, 0.3)';
    default:
      return `0px ${elevation}px ${elevation * 2}px rgba(0, 0, 0, 0.1)`;
  }
}

export default function Card({
  children,
  style,
  elevation = 2,
  Component = View,
  ...rest
}: CardProps) {
  const shadowStyle =
    elevation === 5
      ? Platform.select(shadows.md)
      : Platform.select({
          ios: { elevation },
          android: { elevation },
          web: { boxShadow: getBoxShadow(elevation) },
        });

  return (
    <Component style={[styles.card, shadowStyle, style]} {...rest}>
      {children}
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
  },
});

