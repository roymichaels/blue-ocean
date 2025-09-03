import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { spacing } from '../tokens';

interface FieldProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function Field({ children, style }: FieldProps) {
  return <View style={[{ marginBottom: spacing.spacer16 }, style]}>{children}</View>;
}
