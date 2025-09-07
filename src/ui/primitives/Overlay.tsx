import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';

interface OverlayProps {
  style?: StyleProp<ViewStyle>;
}

export default function Overlay({ style }: OverlayProps) {
  return <View style={[StyleSheet.absoluteFill, style, { pointerEvents: 'none' }]} />;
}
