import { errorLog } from '@/utils/logger';
import PinataService from './pinata';
import * as VideoThumbnails from 'expo-video-thumbnails';

class MediaService {
  private static instance: MediaService;

  private constructor() {}

  public static getInstance(): MediaService {
    if (!MediaService.instance) {
      MediaService.instance = new MediaService();
    }
    return MediaService.instance;
  }

  /**
   * Check if Pinata credentials are configured
   */
  async isPinataConfigured(): Promise<boolean> {
    const pinataService = PinataService.getInstance();
    return await pinataService.isPinataConfigured();
  }

  /**
   * Upload media to Pinata IPFS
   * @param onProgress - Optional progress callback (0-100)
   */
  async uploadMedia(
    uri: string,
    name: string,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    try {
      const pinataService = PinataService.getInstance();
      return await pinataService.uploadFile(uri, name, onProgress);
    } catch (error) {
      errorLog('Error uploading media:', error);
      // Return the original URI as fallback
      return uri;
    }
  }

  /**
   * Validate a CID against Pinata's API.
   */
  async validateCid(cid: string): Promise<boolean> {
    const svc = PinataService.getInstance();
    return await svc.validateCid(cid);
  }

  /**
   * Resolve a CID or ipfs:// URI to a gateway URL after validation.
   * Returns null if the CID fails validation.
   */
  async resolveUri(uri: string): Promise<string | null> {
    const svc = PinataService.getInstance();
    if (!svc.isCidOrUrl(uri)) return uri;
    const cleaned = uri.replace(/^ipfs:\/\//, '');
    const ok = await this.validateCid(cleaned);
    return ok ? `https://gateway.pinata.cloud/ipfs/${cleaned}` : null;
  }

  /**
   * Upload multiple media files
   */
  async uploadMultipleFiles(files: { uri: string, name: string }[]): Promise<string[]> {
    try {
      // Upload each file in parallel
      const uploadPromises = files.map(file => this.uploadMedia(file.uri, file.name));
      return await Promise.all(uploadPromises);
    } catch (error) {
      errorLog('Error uploading multiple files:', error);
      // Return original URIs as fallback
      return files.map(file => file.uri);
    }
  }

  /**
   * Convert a data URL to a Blob
   */
  dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Get file extension from MIME type
   */
  getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav'
    };
    
    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * Generate a thumbnail for a video at the given time in ms
   */
  async generateVideoThumbnail(uri: string, timeMs = 1000): Promise<string | null> {
    try {
      const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(uri, {
        time: timeMs,
      });
      return thumbnailUri;
    } catch (error) {
      errorLog('Error generating video thumbnail:', error);
      return null;
    }
  }
}

export default MediaService;
