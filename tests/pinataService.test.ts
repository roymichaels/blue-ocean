import { insertConfig } from './testUtils';
import { loadTenantSettings, getAdmins } from '@/constants/tenant';
import PinataService from '@/services/pinata';
import fs from 'fs';
import path from 'path';

describe('PinataService', () => {
  beforeEach(async () => {
    insertConfig({
      NEAR_RPC_URL: 'https://near.example',
      ADMIN_WALLET_ADDRESS_MAINNET: undefined,
      ADMIN_WALLET_ADDRESS_TESTNET: undefined,
      EXPO_PUBLIC_PINATA_API_KEY: undefined,
      EXPO_PUBLIC_PINATA_SECRET_API_KEY: undefined,
      EXPO_PUBLIC_PINATA_JWT: undefined,
    });
    await loadTenantSettings();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns URI unchanged when already CID or URL', async () => {
    const admins = await getAdmins();
    expect(admins).toEqual([]);
    const svc = PinataService.getInstance();
    const cid = 'ipfs://bafybeigdyrzt5u2r6sxcv5a3dyhv6aipjfiv6t5bygbw4s3z6';
    const url = 'https://example.com/file.png';
    await expect(svc.uploadFile(cid, 'file')).resolves.toBe(cid);
    await expect(svc.uploadFile(url, 'file')).resolves.toBe(url);
  });

  it('validates CID and URL strings', () => {
    const svc = PinataService.getInstance();
    expect(svc.isCidOrUrl('bafybeigdyrzt5u2r6sxcv5a3dyhv6aipjfiv6t5bygbw4s3z6')).toBe(true);
    expect(svc.isCidOrUrl('ipfs://bafybeigdyrzt5u2r6sxcv5a3dyhv6aipjfiv6t5bygbw4s3z6')).toBe(true);
    expect(svc.isCidOrUrl('https://example.com')).toBe(true);
    expect(svc.isCidOrUrl('not-a-cid')).toBe(false);
  });

  it('detects configured JWT credential', async () => {
    insertConfig({ EXPO_PUBLIC_PINATA_JWT: 'jwt-token' });
    const svc = PinataService.getInstance();
    await expect(svc.isPinataConfigured()).resolves.toBe(true);
  });

  it('detects configured API key/secret', async () => {
    insertConfig({
      EXPO_PUBLIC_PINATA_API_KEY: 'key',
      EXPO_PUBLIC_PINATA_SECRET_API_KEY: 'secret',
    });
    const svc = PinataService.getInstance();
    await expect(svc.isPinataConfigured()).resolves.toBe(true);
  });

  it('uploads file using JWT', async () => {
    insertConfig({ EXPO_PUBLIC_PINATA_JWT: 'jwt-token' });
    const svc = PinataService.getInstance();
    const tmp = path.join(__dirname, 'tmp.txt');
    fs.writeFileSync(tmp, 'hello');
    const mock = jest
      .spyOn(global as any, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ IpfsHash: 'cid123' }) } as any);
    const cid = await svc.uploadFile(tmp, 'tmp.txt');
    expect(cid).toBe('cid123');
    expect(mock).toHaveBeenCalledWith(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }),
      })
    );
    fs.unlinkSync(tmp);
  });

  it('uploads file using API key and secret', async () => {
    insertConfig({
      EXPO_PUBLIC_PINATA_API_KEY: 'key',
      EXPO_PUBLIC_PINATA_SECRET_API_KEY: 'secret',
    });
    const svc = PinataService.getInstance();
    const tmp = path.join(__dirname, 'tmp2.txt');
    fs.writeFileSync(tmp, 'hello');
    const mock = jest
      .spyOn(global as any, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ IpfsHash: 'cid456' }) } as any);
    const cid = await svc.uploadFile(tmp, 'tmp2.txt');
    expect(cid).toBe('cid456');
    expect(mock).toHaveBeenCalledWith(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          pinata_api_key: 'key',
          pinata_secret_api_key: 'secret',
        }),
      })
    );
    fs.unlinkSync(tmp);
  });
});
