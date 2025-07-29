import PinataService from '../services/pinata';
import axios from 'axios';
import { saveConfigValue } from '../utils/config';

jest.mock('axios');

describe('PinataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects missing credentials', async () => {
    await saveConfigValue('EXPO_PUBLIC_PINATA_JWT', '');
    await saveConfigValue('EXPO_PUBLIC_PINATA_API_KEY', '');
    await saveConfigValue('EXPO_PUBLIC_PINATA_SECRET_API_KEY', '');
    const service = PinataService.getInstance();
    expect(await service.isPinataConfigured()).toBe(false);
  });

  it('detects JWT credentials', async () => {
    await saveConfigValue('EXPO_PUBLIC_PINATA_JWT', 'token');
    await saveConfigValue('EXPO_PUBLIC_PINATA_API_KEY', '');
    await saveConfigValue('EXPO_PUBLIC_PINATA_SECRET_API_KEY', '');
    const service = PinataService.getInstance();
    expect(await service.isPinataConfigured()).toBe(true);
  });

  it('detects API key credentials', async () => {
    await saveConfigValue('EXPO_PUBLIC_PINATA_JWT', '');
    await saveConfigValue('EXPO_PUBLIC_PINATA_API_KEY', 'key');
    await saveConfigValue('EXPO_PUBLIC_PINATA_SECRET_API_KEY', 'secret');
    const service = PinataService.getInstance();
    expect(await service.isPinataConfigured()).toBe(true);
  });

  it('requires both API key and secret', async () => {
    await saveConfigValue('EXPO_PUBLIC_PINATA_JWT', '');
    await saveConfigValue('EXPO_PUBLIC_PINATA_API_KEY', 'key');
    await saveConfigValue('EXPO_PUBLIC_PINATA_SECRET_API_KEY', '');
    const service = PinataService.getInstance();
    expect(await service.isPinataConfigured()).toBe(false);
  });

  it('skips upload when URI is already a URL', async () => {
    const url = 'https://example.com/file.png';
    const service = PinataService.getInstance();
    const result = await service.uploadFile(url, 'file');
    expect(result).toBe(url);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
