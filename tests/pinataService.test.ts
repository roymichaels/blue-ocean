import PinataService from '../services/pinata';
import axios from 'axios';

jest.mock('axios');

describe('PinataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects missing credentials', () => {
    process.env.EXPO_PUBLIC_PINATA_JWT = '';
    process.env.EXPO_PUBLIC_PINATA_API_KEY = '';
    process.env.EXPO_PUBLIC_PINATA_SECRET_API_KEY = '';
    const service = PinataService.getInstance();
    expect(service.isPinataConfigured()).toBe(false);
  });

  it('skips upload when URI is already a URL', async () => {
    const url = 'https://example.com/file.png';
    const service = PinataService.getInstance();
    const result = await service.uploadFile(url, 'file');
    expect(result).toBe(url);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
