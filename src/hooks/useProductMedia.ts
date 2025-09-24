import { useEffect, useState } from 'react';
import MediaService from '@/services/media';
import { Product } from '@/types';
import { errorLog } from '@/utils/logger';

export interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name?: string;
  thumbnail?: string;
}

export function useProductMedia(product: Product | null) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mainImageUri, setMainImageUri] = useState<string | undefined>();

  useEffect(() => {
    const loadMedia = async () => {
      if (!product) {
        setMedia([]);
        setMainImageUri(undefined);
        return;
      }

      const items: MediaItem[] = [];

      product.images?.forEach((uri, index) => {
        items.push({
          id: `image_${index}`,
          uri,
          type: 'image',
          name: `Image ${index + 1}`,
        });
      });

      const svc = MediaService.getInstance();
      if (product.videos) {
        for (let i = 0; i < product.videos.length; i++) {
          const uri = product.videos[i];
          const id = `video_${i}`;
          try {
            const thumb = await svc.generateVideoThumbnail(uri);
            items.push({
              id,
              uri,
              type: 'video',
              name: `Video ${i + 1}`,
              thumbnail: thumb || undefined,
            });
          } catch (err) {
            errorLog('Error generating video thumbnail:', err);
            items.push({
              id,
              uri,
              type: 'video',
              name: `Video ${i + 1}`,
            });
          }
        }
      }

      setMedia(items);
      if (items.length > 0) {
        const first = items[0];
        setMainImageUri(
          first.type === 'video' ? first.thumbnail || first.uri : first.uri
        );
      } else {
        setMainImageUri(undefined);
      }
    };

    loadMedia();
  }, [product]);

  return { media, mainImageUri };
}

export default useProductMedia;
