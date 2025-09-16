import fs from 'fs';
import path from 'path';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { etc, getPublicKey, utils as edUtils } from '@noble/ed25519';
import { randomBytes, randomUUID } from 'crypto';
import { canonicalJson } from '@/utils/serialization';
import PinataService from '@/services/pinata';
import { encryptForTenant } from '@/services/kycUpload';
import {
  resetTrackedKycCapturedPaths,
  trackKycCapturedPath,
  untrackKycCapturedPath,
} from '@/utils/kycTemp';

jest.mock('@/services/localIdentity', () => ({
  getEd25519KeyPair: jest.fn(async () => ({
    privateKey: new Uint8Array(32).fill(1),
    publicKey: new Uint8Array(32).fill(2),
  })),
}));

Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: {
    getRandomValues: (array: Uint8Array) => {
      const bytes = randomBytes(array.length);
      array.set(bytes);
      return array;
    },
    randomUUID: () => randomUUID(),
    subtle: {
      importKey: async () => ({}) as CryptoKey,
      encrypt: async (
        _algo: AlgorithmIdentifier | AesKeyAlgorithm,
        _key: CryptoKey,
        data: ArrayBufferView | ArrayBuffer,
      ) => (data instanceof ArrayBuffer ? data : (data as ArrayBufferView).buffer),
      decrypt: async (
        _algo: AlgorithmIdentifier | AesKeyAlgorithm,
        _key: CryptoKey,
        data: ArrayBufferView | ArrayBuffer,
      ) => (data instanceof ArrayBuffer ? data : (data as ArrayBufferView).buffer),
    },
  } as unknown as Crypto,
});

describe('encryptForTenant', () => {
  if (!etc.sha512Sync) {
    etc.sha512Sync = (message: Uint8Array) => sha512(message);
  }

  afterEach(() => {
    resetTrackedKycCapturedPaths();
    jest.restoreAllMocks();
  });

  it('returns encrypted uri and hash while cleaning temporary files', async () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'kyc-upload-test-'));
    const filePath = path.join(tempDir, 'doc.png');
    fs.writeFileSync(filePath, 'hello');

    try {
      const pinata = PinataService.getInstance();
      const uploadSpy = jest
        .spyOn(pinata, 'uploadFile')
        .mockResolvedValue('cid123');

      const tenantPriv = edUtils.randomPrivateKey();
      const tenantPub = await getPublicKey(tenantPriv);
      const tenantPubHex = Buffer.from(tenantPub).toString('hex');

      trackKycCapturedPath(filePath);
      const result = await encryptForTenant(tenantPubHex, [
        { uri: filePath, name: 'doc.png' },
      ]);

      expect(uploadSpy).toHaveBeenCalledTimes(1);
      expect(uploadSpy.mock.calls[0][0]).toContain('kyc-');
      expect(result.uri).toBe('ipfs://cid123');

      const fileBytes = Buffer.from('hello');
      const fileHash = Buffer.from(sha256(new Uint8Array(fileBytes))).toString('hex');
      const manifest = {
        version: 1,
        files: [
          { name: 'doc.png', type: 'application/octet-stream', size: 5, hash: fileHash },
        ],
      };
      const manifestBytes = Buffer.from(canonicalJson(manifest));
      const expectedHash = Buffer.from(sha256(new Uint8Array(manifestBytes))).toString('hex');
      expect(result.hash).toBe(expectedHash);

      expect(fs.existsSync(filePath)).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps tracked captures when upload fails', async () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'kyc-upload-failure-'));
    const filePath = path.join(tempDir, 'doc.png');
    fs.writeFileSync(filePath, 'hello');

    try {
      const pinata = PinataService.getInstance();
      jest
        .spyOn(pinata, 'uploadFile')
        .mockRejectedValue(new Error('upload failed'));

      const tenantPriv = edUtils.randomPrivateKey();
      const tenantPub = await getPublicKey(tenantPriv);
      const tenantPubHex = Buffer.from(tenantPub).toString('hex');

      trackKycCapturedPath(filePath);

      await expect(
        encryptForTenant(tenantPubHex, [{ uri: filePath, name: 'doc.png' }]),
      ).rejects.toThrow('upload failed');

      expect(fs.existsSync(filePath)).toBe(true);
    } finally {
      untrackKycCapturedPath(filePath);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
