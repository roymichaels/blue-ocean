import { debugLog } from '@/utils/logger';
import { CID } from 'multiformats/cid';

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
   * This relies on multiformats to validate CIDs and the WHATWG URL parser for
   * web links.
   */
  public isCidOrUrl(uri: string): boolean {
    if (!uri) return false;

    // Accept valid HTTP(S) URLs
    try {
      // eslint-disable-next-line no-new
      new URL(uri);
      return true;
    } catch {}

    // Strip ipfs:// prefix if present and attempt to parse as CID
    const cleaned = uri.replace(/^ipfs:\/\//, '').split('/')[0];
    try {
      CID.parse(cleaned);
      return true;
    } catch {
      return false;
    }
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

