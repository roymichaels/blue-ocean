import MediaService from '@/services/media';
import { insertConfig } from '../testUtils';

describe('MediaService CID validation', () => {
  beforeEach(() => {
    insertConfig({ EXPO_PUBLIC_PINATA_JWT: 'jwt-token' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('confirms pinned CID', async () => {
    const svc = MediaService.getInstance();
    const mock = jest
      .spyOn(global as any, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ count: 1 }) } as any);
    await expect(svc.validateCid('cid123')).resolves.toBe(true);
    expect(mock).toHaveBeenCalledWith(
      expect.stringContaining('hashContains=cid123'),
      expect.any(Object)
    );
  });

  it('rejects missing CID', async () => {
    const svc = MediaService.getInstance();
    jest
      .spyOn(global as any, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ count: 0 }) } as any);
    await expect(svc.validateCid('cid999')).resolves.toBe(false);
  });
});
