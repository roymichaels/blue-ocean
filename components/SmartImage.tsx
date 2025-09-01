import React, { useState } from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';

const fallback = require('../assets/images/icon.png');
const shimmer = { blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J]' };

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
  placeholder = shimmer,
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
      placeholder={placeholder}
      transition={300}
      onError={() => setSource(fallback)}
    />
  );
}
