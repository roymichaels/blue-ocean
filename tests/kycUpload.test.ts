import fs from 'fs';
import os from 'os';
import path from 'path';
import { sha256 } from '@noble/hashes/sha256';
import { getPublicKey, utils as edUtils } from '@noble/ed25519';
import { canonicalJson } from '@/utils/serialization';
import PinataService from '@/services/pinata';
import { encryptForTenant } from '@/services/kycUpload';

describe('encryptForTenant', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns encrypted uri and hash while cleaning temporary files', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kyc-upload-'));
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

      const result = await encryptForTenant(tenantPubHex, [
        { uri: filePath, name: 'doc.png' },
      ]);

      expect(uploadSpy).toHaveBeenCalledTimes(1);
      expect(uploadSpy.mock.calls[0][0]).toContain('kyc-');
      expect(result.uri).toBe('ipfs://cid123');

      const fileHash = Buffer.from(sha256(Buffer.from('hello'))).toString('hex');
      const manifest = {
        version: 1,
        files: [
          { name: 'doc.png', type: 'application/octet-stream', size: 5, hash: fileHash },
        ],
      };
      const expectedHash = Buffer.from(sha256(Buffer.from(canonicalJson(manifest)))).toString('hex');
      expect(result.hash).toBe(expectedHash);

      expect(fs.existsSync(filePath)).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
