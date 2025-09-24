import { getHealthyRpcUrl } from '@/services/walletSelector';

describe('getHealthyRpcUrl', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    (global.fetch as any).mockClear?.();
    global.fetch = originalFetch;
  });

  it('falls back to secondary RPC when primary fails', async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue({ ok: true } as any);
    global.fetch = mockFetch as any;

    const url = await getHealthyRpcUrl([
      'https://primary.rpc',
      'https://secondary.rpc',
    ]);
    expect(url).toBe('https://secondary.rpc');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
