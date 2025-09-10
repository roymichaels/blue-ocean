import { debugLog } from '@/utils/logger';
import isCidOrUrl from '@/utils/isCidOrUrl';
import config from '@/config';
import { aesEncrypt } from '@/utils/encryption';
import { getPrivateKey } from './localIdentity';
import { sha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';

/**
 * Minimal Pinata helper. Supports uploads using either a JWT or
 * API key/secret. Falls back to no-op when credentials are missing.
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
   * Upload a file to Pinata. If the input is already a CID or URL it is
   * returned unchanged. When no Pinata credentials are configured the upload
   * is skipped and the original URI returned.
   */
  public async uploadFile(
    uri: string,
    name: string,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    if (this.isCidOrUrl(uri)) {
      return uri;
    }

    if (!(await this.isPinataConfigured())) {
      debugLog('Pinata upload skipped; provide a CID or URL instead:', uri);
      return uri;
    }

    const jwt = config.EXPO_PUBLIC_PINATA_JWT;
    const apiKey = config.EXPO_PUBLIC_PINATA_API_KEY;
    const secret = config.EXPO_PUBLIC_PINATA_SECRET_API_KEY;

    const form = new FormData();

    if (typeof window === 'undefined') {
      const fs = await import('fs/promises');
      const path = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      const buffer = await fs.readFile(path);
      await this.secureDelete(path);
      (form as any).append('file', new Blob([buffer.buffer]), name);
    } else {
      form.append('file', { uri, name, type: 'application/octet-stream' } as any);
    }

    const headers: Record<string, string> = {};
    if (jwt) {
      headers.Authorization = `Bearer ${jwt}`;
    } else if (apiKey && secret) {
      headers.pinata_api_key = apiKey;
      headers.pinata_secret_api_key = secret;
    }

    onProgress?.(0);
    const res = await fetch(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      {
        method: 'POST',
        body: form as any,
        headers,
      }
    );
    if (!res.ok) {
      throw new Error(`Pinata upload failed: ${res.status}`);
    }
    const json = await res.json();
    onProgress?.(100);
    return json.IpfsHash as string;
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    const priv = await getPrivateKey();
    const material = sha256(Buffer.from(priv));
    return crypto.subtle.importKey(
      'raw',
      material,
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    );
  }

  private async secureDelete(path: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      const data = await fs.readFile(path);
      const key = await this.getEncryptionKey();
      const enc = await aesEncrypt(Buffer.from(data).toString('base64'), key);
      await fs.writeFile(path, enc);
    } catch {}
    try {
      await fs.unlink(path);
    } catch {}
  }

  /**
   * Validate that a given CID is pinned on Pinata.
   * Returns true when the CID exists in the authenticated account.
   */
  public async validateCid(cid: string): Promise<boolean> {
    const cleaned = cid.replace(/^ipfs:\/\//, '').trim();
    if (!this.isCidOrUrl(cleaned)) return false;

    if (!(await this.isPinataConfigured())) {
      // Without credentials we cannot query Pinata; assume valid
      return true;
    }

    const jwt = config.EXPO_PUBLIC_PINATA_JWT;
    const apiKey = config.EXPO_PUBLIC_PINATA_API_KEY;
    const secret = config.EXPO_PUBLIC_PINATA_SECRET_API_KEY;

    const headers: Record<string, string> = {};
    if (jwt) {
      headers.Authorization = `Bearer ${jwt}`;
    } else if (apiKey && secret) {
      headers.pinata_api_key = apiKey;
      headers.pinata_secret_api_key = secret;
    }

    try {
      const res = await fetch(
        `https://api.pinata.cloud/data/pinList?hashContains=${cleaned}`,
        { headers },
      );
      if (!res.ok) return false;
      const json = await res.json();
      return (json.count || 0) > 0;
    } catch {
      return false;
    }
  }

  public async isPinataConfigured(): Promise<boolean> {
    const jwt = config.EXPO_PUBLIC_PINATA_JWT;
    const apiKey = config.EXPO_PUBLIC_PINATA_API_KEY;
    const secret = config.EXPO_PUBLIC_PINATA_SECRET_API_KEY;
    return Boolean(jwt || (apiKey && secret));
  }
}

export default PinataService;

