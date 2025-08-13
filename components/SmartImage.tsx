import React, { useState } from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';

const placeholder = require('../assets/images/icon.png');

interface SmartImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
}

export default function SmartImage({ uri, style, contentFit = 'cover', cachePolicy = 'disk', ...props }: SmartImageProps) {
  const [source, setSource] = useState<{ uri: string } | number>({ uri });

  return (
    <ExpoImage
      {...props}
      source={source}
      style={style}
      contentFit={contentFit}
      cachePolicy={cachePolicy}
      placeholder={placeholder}
      onError={() => setSource(placeholder)}
    />
  );
}
