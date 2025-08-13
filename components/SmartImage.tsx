import React, { useState } from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';

const fallback = require('../assets/images/icon.png');
const shimmer = { blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J]' };

interface SmartImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
}

export default function SmartImage({
  uri,
  style,
  contentFit = 'cover',
  cachePolicy = 'disk',
  placeholder = shimmer,
  ...props
}: SmartImageProps) {
  const [source, setSource] = useState<{ uri: string } | number>({ uri });

  return (
    <ExpoImage
      {...props}
      source={source}
      style={style}
      contentFit={contentFit}
      cachePolicy={cachePolicy}
      placeholder={placeholder}
      transition={300}
      onError={() => setSource(fallback)}
    />
  );
}
