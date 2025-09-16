import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';
import { canonicalJson } from '@/utils/serialization';
import { deriveSharedKey, deriveChatSalt, aesEncrypt } from '@/utils/encryption';
import { getEd25519KeyPair } from './localIdentity';
import PinataService from './pinata';
import * as FileSystem from 'expo-file-system';

export interface KycUploadFile {
  uri: string;
  name?: string;
  type?: string;
}

export interface EncryptedKycDocument {
  uri: string;
  hash: string;
}

const INFO_LABEL = 'kyc.v1';

function toFilePath(uri: string): string {
  return uri.startsWith('file://') ? uri.replace('file://', '') : uri;
}

async function readBinary(uri: string): Promise<Buffer> {
  if (typeof FileSystem.readAsStringAsync === 'function') {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: (FileSystem.EncodingType as any)?.Base64 ?? 'base64',
    });
    return Buffer.from(base64, 'base64');
  }
  const fs = await import('fs/promises');
  const data = await fs.readFile(toFilePath(uri));
  return Buffer.from(data);
}

function randomSuffix(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function writeTemp(contents: string): Promise<string> {
  if (
    typeof FileSystem.writeAsStringAsync === 'function' &&
    typeof FileSystem.cacheDirectory === 'string'
  ) {
    const path = `${FileSystem.cacheDirectory}kyc-${randomSuffix()}.json`;
    await FileSystem.writeAsStringAsync(path, contents, {
      encoding: (FileSystem.EncodingType as any)?.UTF8 ?? 'utf8',
    });
    return path;
  }
  const fs = await import('fs/promises');
  const os = await import('os');
  const path = await import('path');
  const filePath = path.join(os.tmpdir(), `kyc-${randomSuffix()}.json`);
  await fs.writeFile(filePath, contents, 'utf8');
  return filePath;
}

async function removeFile(uri: string): Promise<void> {
  if (!uri) return;
  if (typeof FileSystem.deleteAsync === 'function') {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return;
    } catch {}
  }
  try {
    const fs = await import('fs/promises');
    await fs.unlink(toFilePath(uri));
  } catch {}
}

async function cleanupSource(uri: string): Promise<void> {
  if (!uri) return;
  if (
    typeof FileSystem.deleteAsync === 'function' &&
    (typeof FileSystem.cacheDirectory === 'string' ||
      typeof FileSystem.temporaryDirectory === 'string')
  ) {
    const { cacheDirectory, temporaryDirectory } = FileSystem;
    if (
      (cacheDirectory && uri.startsWith(cacheDirectory)) ||
      (temporaryDirectory && uri.startsWith(temporaryDirectory))
    ) {
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {}
    }
    return;
  }
  try {
    const os = await import('os');
    const tmpDir = os.tmpdir();
    const path = toFilePath(uri);
    if (path.startsWith(tmpDir)) {
      const fs = await import('fs/promises');
      await fs.unlink(path);
    }
  } catch {}
}

function ensureIpfs(uri: string, fallback: string): string {
  if (!uri) return fallback;
  if (uri.startsWith('ipfs://') || uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  return `ipfs://${uri}`;
}

export async function encryptForTenant(
  tenantPublicKey: string,
  files: KycUploadFile[],
): Promise<EncryptedKycDocument> {
  if (!tenantPublicKey) {
    throw new Error('tenant public key required');
  }
  if (!files.length) {
    throw new Error('no KYC files provided');
  }

  const { privateKey, publicKey } = await getEd25519KeyPair();
  const myPubHex = Buffer.from(publicKey).toString('hex');
  const salt = deriveChatSalt(myPubHex, tenantPublicKey);
  const key = await deriveSharedKey(privateKey, tenantPublicKey, INFO_LABEL, salt);

  const enriched = [] as Array<{
    name: string;
    type: string;
    size: number;
    hash: string;
    data: string;
    sourceUri: string;
  }>;

  for (const file of files) {
    const name = file.name || 'document';
    const type = file.type || 'application/octet-stream';
    const buffer = await readBinary(file.uri);
    const hash = Buffer.from(sha256(buffer)).toString('hex');
    const base64 = buffer.toString('base64');
    enriched.push({
      name,
      type,
      size: buffer.byteLength,
      hash,
      data: base64,
      sourceUri: file.uri,
    });
  }

  const manifest = {
    version: 1,
    files: enriched.map(({ name, type, size, hash }) => ({ name, type, size, hash })),
  };

  const manifestHash = Buffer.from(sha256(Buffer.from(canonicalJson(manifest)))).toString('hex');

  const payload = {
    ...manifest,
    createdAt: new Date().toISOString(),
    from: myPubHex,
    files: enriched.map(({ name, type, size, hash, data }) => ({
      name,
      type,
      size,
      hash,
      data,
    })),
  };

  const cipher = await aesEncrypt(canonicalJson(payload), key);
  const encryptedBody = canonicalJson({ version: 1, cipher });

  const tempPath = await writeTemp(encryptedBody);
  let uploaded: string | null = null;
  try {
    const pinata = PinataService.getInstance();
    uploaded = await pinata.uploadFile(tempPath, `kyc-${Date.now()}.json`);
  } finally {
    await removeFile(tempPath);
    await Promise.all(enriched.map(({ sourceUri }) => cleanupSource(sourceUri)));
  }

  let finalUri = uploaded ?? '';
  if (!uploaded || uploaded === tempPath || uploaded === `file://${tempPath}`) {
    finalUri = `ipfs://${Buffer.from(sha256(Buffer.from(encryptedBody))).toString('hex')}`;
  } else {
    finalUri = ensureIpfs(uploaded, `ipfs://${Buffer.from(sha256(Buffer.from(encryptedBody))).toString('hex')}`);
  }

  return { uri: finalUri, hash: manifestHash };
}

export default {
  encryptForTenant,
};
