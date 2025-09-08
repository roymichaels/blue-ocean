import React, { useState } from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';
import { Platform } from 'react-native';

const fallback = require('../assets/images/icon.png');
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
  const [source, setSource] = useState<{ uri: string } | number>({ uri });

  return (
    <ExpoImage
      {...props}
      source={source}
      width={width}
      height={height}
      style={style}
      contentFit={contentFit}
      cachePolicy={cachePolicy}
      placeholder={Platform.OS === 'web' ? undefined : shimmer}
      transition={300}
      onError={() => setSource(fallback)}
    />
  );
}
