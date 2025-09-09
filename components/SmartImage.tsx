import React from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';
import { Platform, View } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
// blurhash placeholder used while the image loads
const shimmer = 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH';

interface SmartImageProps extends Omit<ImageProps, 'source' | 'width' | 'height'> {
  uri?: string | null;
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
  const { colors } = useTheme();

  if (!uri) {
    if (__DEV__) {
      console.warn('SmartImage: missing image uri');
    }
    return (
      <View
        style={[{ width, height, backgroundColor: colors.surface.secondary }, style]}
      />
    );
  }

  return (
    // @ts-ignore Expo Image supports width/height as props
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
