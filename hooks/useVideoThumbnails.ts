import { useState, useEffect } from 'react';
import { errorLog } from '@/utils/logger';
import MediaService from '@/services/media';

export function useVideoThumbnails(videos?: string[]) {
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadThumbs = async () => {
      if (!videos || videos.length === 0) return;
      const svc = MediaService.getInstance();
      for (let i = 0; i < videos.length; i++) {
        const id = `video_${i}`;
        try {
          const thumb = await svc.generateVideoThumbnail(videos[i]);
          if (thumb) {
            setVideoThumbnails(prev => ({ ...prev, [id]: thumb }));
          }
        } catch (err) {
          errorLog('Error generating video thumbnail:', err);
        }
      }
    };
    loadThumbs();
  }, [videos]);

  return videoThumbnails;
}

export default useVideoThumbnails;
