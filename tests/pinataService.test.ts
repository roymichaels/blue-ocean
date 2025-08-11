import PinataService from '../services/pinata';
import axios from 'axios';

jest.mock('axios');

describe('PinataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips upload when URI is already a URL', async () => {
    const url = 'https://example.com/file.png';
    const service = PinataService.getInstance();
    const result = await service.uploadFile(url, 'file');
    expect(result).toBe(url);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('detects CID strings', () => {
    const service = PinataService.getInstance();
    expect(service.isCid('bafybeigdyrzt5u2r6sxcv5a3dyhv6aipjfiv6t5bygbw4s3z6')).toBe(true);
    expect(service.isCid('ipfs://bafybeigdyrzt5u2r6sxcv5a3dyhv6aipjfiv6t5bygbw4s3z6')).toBe(true);
    expect(service.isCid('https://example.com')).toBe(false);
  });
});
