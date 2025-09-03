import React from 'react';
import { View } from 'react-native';
import { spacing } from '../tokens';

interface SpacerProps {
  size?: keyof typeof spacing;
  horizontal?: boolean;
}

export default function Spacer({ size = 'spacer8', horizontal }: SpacerProps) {
  const dimension = spacing[size];
  return <View style={horizontal ? { width: dimension } : { height: dimension }} />;
}

