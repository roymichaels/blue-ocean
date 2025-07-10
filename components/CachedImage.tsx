import React, { useEffect, useState } from 'react';
import { Image, ImageProps } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
}

export default function CachedImage({ uri, ...props }: CachedImageProps) {
  const [source, setSource] = useState<{ uri: string }>();

  useEffect(() => {
    let mounted = true;
    const fileUri = FileSystem.cacheDirectory + encodeURIComponent(uri);

    async function load() {
      try {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
          const downloaded = await FileSystem.downloadAsync(uri, fileUri);
          if (mounted) setSource({ uri: downloaded.uri });
        } else if (mounted) {
          setSource({ uri: info.uri });
        }
      } catch {
        if (mounted) setSource({ uri });
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [uri]);

  if (!source) {
    return null;
  }

  return <Image source={source} {...props} />;
}
