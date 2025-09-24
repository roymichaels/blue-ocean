import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';
import { canonicalJson } from '@/utils/serialization';
import { deriveSharedKey, deriveChatSalt, aesEncrypt } from '@/utils/encryption';
import { cleanupTrackedKycCapturedPaths } from '@/utils/kycTemp';
import { getEd25519KeyPair } from './localIdentity';
import { sign } from '@noble/ed25519';
import { randomBytes } from '@noble/hashes/utils';
import type { KycArtifact, KycArtifactType } from '@/types';
import PinataService from './pinata';
import * as FileSystem from 'expo-file-system';

type ExpoFsExtras = {
  EncodingType?: {
    Base64?: string;
    UTF8?: string;
  };
  cacheDirectory?: string;
  temporaryDirectory?: string;
};

const expoFs = FileSystem as typeof FileSystem & ExpoFsExtras;

export interface KycUploadFile {
  uri: string;
  name?: string;
  type?: string;
  artifactType: KycArtifactType;
  capturedAt: number;
  nonce: string;
  metadata?: Record<string, unknown>;
}

export interface EncryptedKycDocument {
  uri: string;
  hash: string;
}

export interface EncryptedKycBundle {
  document: EncryptedKycDocument;
  artifacts: KycArtifact[];
  ts: number;
  nonce: string;
  sig: string;
}

const INFO_LABEL = 'kyc.v2';

function toFilePath(uri: string): string {
  return uri.startsWith('file://') ? uri.replace('file://', '') : uri;
}

async function readBinary(uri: string): Promise<Buffer> {
  if (typeof FileSystem.readAsStringAsync === 'function') {
    const base64Encoding = expoFs.EncodingType?.Base64 ?? 'base64';
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: base64Encoding as any,
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
    typeof expoFs.cacheDirectory === 'string'
  ) {
    const path = `${expoFs.cacheDirectory}kyc-${randomSuffix()}.json`;
    const utf8Encoding = expoFs.EncodingType?.UTF8 ?? 'utf8';
    await FileSystem.writeAsStringAsync(path, contents, {
      encoding: utf8Encoding as any,
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
    (typeof expoFs.cacheDirectory === 'string' ||
      typeof expoFs.temporaryDirectory === 'string')
  ) {
    const { cacheDirectory, temporaryDirectory } = expoFs;
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
): Promise<EncryptedKycBundle> {
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
    artifactType: KycArtifactType;
    capturedAt: number;
    nonce: string;
    metadata?: Record<string, unknown>;
  }>;

  for (const file of files) {
    const name = file.name || 'document';
    const type = file.type || 'application/octet-stream';
    const buffer = await readBinary(file.uri);
    const bytes = buffer instanceof Uint8Array ? new Uint8Array(buffer) : Uint8Array.from(buffer);
    const hash = Buffer.from(sha256(bytes)).toString('hex');
    const base64 = Buffer.from(bytes).toString('base64');
    enriched.push({
      name,
      type,
      size: buffer.byteLength,
      hash,
      data: base64,
      sourceUri: file.uri,
      artifactType: file.artifactType,
      capturedAt: file.capturedAt,
      nonce: file.nonce,
      metadata: file.metadata,
    });
  }

  const manifest = {
    version: 2,
    files: enriched.map(({ name, type, size, hash }) => ({ name, type, size, hash })),
    artifacts: enriched.map(({ artifactType, capturedAt, nonce, metadata, hash }) => ({
      type: artifactType,
      ts: capturedAt,
      nonce,
      hash,
      metadata: metadata ?? {},
    })),
  };

  const manifestBytes = Buffer.from(canonicalJson(manifest));
  const manifestHash = Buffer.from(sha256(new Uint8Array(manifestBytes))).toString('hex');

  const payload = {
    ...manifest,
    createdAt: new Date().toISOString(),
    from: myPubHex,
    files: enriched.map(({ name, type, size, hash, data, artifactType, capturedAt, nonce, metadata }) => ({
      name,
      type,
      size,
      hash,
      data,
      artifactType,
      capturedAt,
      nonce,
      metadata,
    })),
  };

  const cipher = await aesEncrypt(canonicalJson(payload), key);
  const encryptedBody = canonicalJson({ version: 1, cipher });

  const tempPath = await writeTemp(encryptedBody);
  let uploaded: string | null = null;
  try {
    const pinata = PinataService.getInstance();
    uploaded = await pinata.uploadFile(tempPath, `kyc-${Date.now()}.json`);

    await cleanupTrackedKycCapturedPaths(enriched.map(({ sourceUri }) => sourceUri));
    await Promise.all(enriched.map(({ sourceUri }) => cleanupSource(sourceUri)));
  } finally {
    await removeFile(tempPath);
  }

  const encryptedBodyBytes = Buffer.from(encryptedBody);
  const encryptedBodyHash = Buffer.from(sha256(new Uint8Array(encryptedBodyBytes))).toString('hex');

  let finalUri = uploaded ?? '';
  if (!uploaded || uploaded === tempPath || uploaded === `file://${tempPath}`) {
    finalUri = `ipfs://${encryptedBodyHash}`;
  } else {
    finalUri = ensureIpfs(uploaded, `ipfs://${encryptedBodyHash}`);
  }

  const artifacts: KycArtifact[] = enriched.map(({
    artifactType,
    capturedAt,
    nonce,
    metadata,
    hash,
  }) => ({
    type: artifactType,
    ts: capturedAt,
    nonce,
    metadata,
    uri: finalUri,
    hash,
  }));

  const bundleTs = Date.now();
  const bundleNonce = Buffer.from(randomBytes(16)).toString('hex');
  const signaturePayload = canonicalJson({
    artifacts: artifacts.map(({ type, ts, nonce, hash, metadata }) => ({
      type,
      ts,
      nonce,
      hash,
      metadata: metadata ?? {},
    })),
    ts: bundleTs,
    nonce: bundleNonce,
  });
  const sigBytes = await sign(Buffer.from(signaturePayload), privateKey);
  const sig = Buffer.from(sigBytes).toString('hex');

  return {
    document: { uri: finalUri, hash: manifestHash },
    artifacts,
    ts: bundleTs,
    nonce: bundleNonce,
    sig,
  };
}

export default {
  encryptForTenant,
};
