import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

interface FormProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function Form({ children, style }: FormProps) {
  return <View style={style}>{children}</View>;
}
