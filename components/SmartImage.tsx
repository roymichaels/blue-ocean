import React from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';
import { Platform } from 'react-native';
// blurhash placeholder used while the image loads
const shimmer = 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH';

interface SmartImageProps extends Omit<ImageProps, 'source' | 'width' | 'height'> {
  uri: string;
  width: number;
  height: number;
}

export default function SmartImage({
  uri,
  width,
  height,
  style,
  contentFit = 'cover',
  cachePolicy = 'memory-disk',
  ...props
}: SmartImageProps) {
  return (
    <ExpoImage
      {...props}
      source={{ uri }}
      width={width}
      height={height}
      style={style}
      contentFit={contentFit}
      cachePolicy={cachePolicy}
      placeholder={Platform.OS === 'web' ? undefined : shimmer}
      transition={300}
    />
  );
}
