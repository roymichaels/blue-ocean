import axios from 'axios';
import { debugLog } from '../utils/logger';

// Pinata API configuration
const PINATA_API_KEY =
  process.env.EXPO_PUBLIC_PINATA_API_KEY || 'YOUR_PINATA_API_KEY';
const PINATA_SECRET_API_KEY =
  process.env.EXPO_PUBLIC_PINATA_SECRET_API_KEY || 'YOUR_PINATA_SECRET_KEY';
const PINATA_JWT = process.env.EXPO_PUBLIC_PINATA_JWT || 'YOUR_PINATA_JWT';
const PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs/';

class PinataService {
  private static instance: PinataService;

  private constructor() {}

  public static getInstance(): PinataService {
    if (!PinataService.instance) {
      PinataService.instance = new PinataService();
    }
    return PinataService.instance;
  }

  /**
   * Upload a file to Pinata IPFS
   * @param uri - The local URI of the file to upload
   * @param name - The name of the file
   * @returns The IPFS URL of the uploaded file
   */
  public async uploadFile(uri: string, name: string): Promise<string> {
    try {
      // Check if the URI is already an IPFS or HTTP URL
      if (
        uri.startsWith('http') ||
        uri.startsWith('https') ||
        uri.startsWith('ipfs://')
      ) {
        debugLog('File is already a URL, skipping upload:', uri);
        return uri;
      }

      // For web platform or when using remote images, just return the URI
      if (
        uri.startsWith('data:') ||
        uri.includes('pexels.com') ||
        uri.includes('gateway.pinata.cloud')
      ) {
        debugLog('Using existing image URL:', uri);
        return uri;
      }

      debugLog('Uploading file to Pinata:', name);

      // Create form data for the file upload
      const formData = new FormData();

      // Get the file extension
      const fileExtension = uri.split('.').pop() || 'jpg';

      // Add the file to the form data
      if (uri.startsWith('file://')) {
        const mimeType = this.getMimeTypeFromExtension(fileExtension);
        formData.append(
          'file',
          { uri, name: `${name}.${fileExtension}`, type: mimeType } as any
        );
      } else {
        const blob = await this.uriToBlob(uri);
        formData.append('file', blob, `${name}.${fileExtension}`);
      }

      // Add metadata
      formData.append(
        'pinataMetadata',
        JSON.stringify({
          name: name,
        })
      );

      // Add options
      formData.append(
        'pinataOptions',
        JSON.stringify({
          cidVersion: 1,
        })
      );

      // Upload to Pinata
      const headers: any = {};
      if (PINATA_JWT) {
        headers.Authorization = `Bearer ${PINATA_JWT}`;
      } else {
        headers.pinata_api_key = PINATA_API_KEY;
        headers.pinata_secret_api_key = PINATA_SECRET_API_KEY;
      }

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers,
        }
      );

      // Return the IPFS URL
      const ipfsHash = response.data.IpfsHash;
      const ipfsUrl = `${PINATA_GATEWAY_URL}${ipfsHash}`;
      debugLog('File uploaded to Pinata:', ipfsUrl);
      return ipfsUrl;
    } catch (error) {
      console.error('Error uploading to Pinata:', error);
      // Return the original URI as fallback
      return uri;
    }
  }

  /**
   * Convert a URI to a Blob
   * @param uri - The URI to convert
   * @returns A Blob object
   */
  private async uriToBlob(uri: string): Promise<Blob> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error converting URI to Blob:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromExtension(ext: string): string {
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogg: 'video/ogg',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Check if Pinata credentials are configured
   * @returns True if Pinata is configured, false otherwise
   */
  public isPinataConfigured(): boolean {
    return !!(PINATA_JWT || (PINATA_API_KEY && PINATA_SECRET_API_KEY));
  }
}

export default PinataService;
