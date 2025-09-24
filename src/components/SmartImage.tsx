import React from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';
import { Platform, View } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';

// blurhash placeholder used while the image loads
const shimmer = 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH';

interface SmartImageProps extends Omit<ImageProps, 'source' | 'width' | 'height'> {
  uri?: string | null;
  source?: ImageProps['source'];
  width: number;
  height: number;
}

export default function SmartImage({
  uri,
  source,
  width,
  height,
  style,
  contentFit = 'cover',
  cachePolicy = 'memory-disk',
  ...props
}: SmartImageProps) {
  const { colors } = useTheme();

  const resolvedSource = source ?? (uri ? { uri } : undefined);

  if (!resolvedSource) {
    if (__DEV__) {
      console.warn('SmartImage: missing image uri or source');
    }
    return (
      <View
        style={[{ width, height, backgroundColor: colors.surface.secondary }, style]}
      />
    );
  }

  return (
    <ExpoImage
      {...props}
      source={resolvedSource}
      style={[{ width, height }, style]}
      contentFit={contentFit}
      cachePolicy={cachePolicy}
      placeholder={Platform.OS === 'web' ? undefined : shimmer}
      transition={300}
    />
  );
}
