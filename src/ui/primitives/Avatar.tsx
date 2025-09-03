import React from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';
import { radius } from '../tokens';

interface AvatarProps {
  uri: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export default function Avatar({ uri, size = 40, style }: AvatarProps) {
  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size, borderRadius: radius.full }, style]}
    />
  );
}
