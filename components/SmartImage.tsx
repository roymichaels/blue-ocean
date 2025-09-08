import React, { useState } from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';
import { Platform } from 'react-native';

const fallback = require('../assets/images/icon.png');
// Valid blurhash placeholder used while the image loads
// Original hash: LKO2?U%2Tw=w]~RBVZRi};RPxuwH
const shimmer = String.fromCharCode(
  76, 75, 79, 50, 63, 85, 37, 50, 84, 119, 61, 119, 93, 126, 82, 66,
  86, 90, 82, 105, 125, 59, 82, 80, 120, 117, 119, 72
);

const webPlaceholder =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

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
      placeholder={Platform.OS === 'web' ? webPlaceholder : shimmer}
      transition={300}
      onError={() => setSource(fallback)}
    />
  );
}
