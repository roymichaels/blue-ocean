import { insertConfig } from './testUtils';
import { loadTenantSettings, getAdmins } from '../constants/tenant';
import PinataService from '../services/pinata';

describe('PinataService', () => {
  beforeEach(async () => {
    insertConfig({
      ORDER_PAYMENT_FACTORY_ADDRESS: '0x0',
      TON_RPC_URL: 'https://ton.example',
      ADMIN_WALLET_ADDRESS: undefined,
    });
    await loadTenantSettings();
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
});
