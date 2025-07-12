import PinataService from './pinata';

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
      console.error('Error uploading media:', error);
      // Return the original URI as fallback
      return uri;
    }
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
      console.error('Error uploading multiple files:', error);
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
}

export default MediaService;
