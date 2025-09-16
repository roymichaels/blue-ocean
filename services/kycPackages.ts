import { Buffer } from 'buffer';
import { deriveChatSalt, deriveSharedKey, aesDecrypt } from '@/utils/encryption';
import { getEd25519KeyPair } from '@/services/localIdentity';

export interface KycPackageResolution {
  encrypted: boolean;
  payload: unknown;
  raw: string;
  source: string;
  sender?: string;
}

interface EncryptedKycPackage {
  cipher: string;
  from: string;
  kind?: string;
}

function isEncryptedPackage(value: any): value is EncryptedKycPackage {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.cipher === 'string' &&
    value.cipher.length > 0 &&
    typeof value.from === 'string' &&
    value.from.length > 0
  );
}

function resolveUri(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    const cid = uri.slice('ipfs://'.length);
    return `https://ipfs.io/ipfs/${cid}`;
  }
  return uri;
}

async function fetchUriContent(uri: string): Promise<string> {
  if (uri.startsWith('data:')) {
    const idx = uri.indexOf('base64,');
    if (idx !== -1) {
      const encoded = uri.slice(idx + 'base64,'.length);
      return Buffer.from(encoded, 'base64').toString('utf-8');
    }
    const plain = uri.slice(uri.indexOf(',') + 1);
    return decodeURIComponent(plain);
  }
  const resolved = resolveUri(uri);
  if (typeof fetch !== 'function') {
    throw new Error('fetch unavailable');
  }
  const response = await fetch(resolved);
  if (!response.ok) {
    throw new Error(`Failed to fetch KYC package (${response.status})`);
  }
  return await response.text();
}

async function decryptPackage(pkg: EncryptedKycPackage): Promise<unknown> {
  const { privateKey, publicKey } = await getEd25519KeyPair();
  const myPublic = Buffer.from(publicKey).toString('hex');
  const salt = deriveChatSalt(pkg.from, myPublic);
  const key = await deriveSharedKey(privateKey, pkg.from, 'kyc', salt);
  const plaintext = await aesDecrypt(pkg.cipher, key);
  try {
    return JSON.parse(plaintext);
  } catch {
    return plaintext;
  }
}

export async function resolveKycPackage(uri: string): Promise<KycPackageResolution | null> {
  if (!uri) return null;
  const raw = await fetchUriContent(uri);
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      encrypted: false,
      payload: raw,
      raw,
      source: uri,
    };
  }
  if (isEncryptedPackage(parsed)) {
    const payload = await decryptPackage(parsed);
    return {
      encrypted: true,
      payload,
      raw,
      source: uri,
      sender: parsed.from,
    };
  }
  return {
    encrypted: false,
    payload: parsed,
    raw,
    source: uri,
  };
}

export default { resolveKycPackage };
