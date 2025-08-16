import { debugLog } from '@/utils/logger';
import isCidOrUrl from '@/utils/isCidOrUrl';

/**
 * Minimal Pinata helper. Uploads are not supported inside the app.
 * Use the standalone CLI script instead. This service only exposes a
 * CID/url check so callers can detect when no upload is required.
 */
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
   * Check whether a string is already an IPFS CID or a regular HTTP(S) URL.
   */
  public isCidOrUrl(uri: string): boolean {
    return isCidOrUrl(uri);
  }

  /**
   * Stub upload method. If the URI is already a CID or URL it is returned
   * unchanged. Otherwise the original URI is returned and a warning is logged.
   */
  public async uploadFile(
    uri: string,
    _name: string,
    _onProgress?: (percent: number) => void
  ): Promise<string> {
    if (this.isCidOrUrl(uri)) {
      return uri;
    }
    debugLog('Pinata upload skipped; provide a CID or URL instead:', uri);
    return uri;
  }

  /** Pinata credentials are not bundled with the app. */
  public async isPinataConfigured(): Promise<boolean> {
    return false;
  }
}

export default PinataService;

