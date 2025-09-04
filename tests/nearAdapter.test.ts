import { nearAdapter } from '@/services/chain/near';

describe('NearAdapter.getBalance', () => {
  it('returns balance from RPC response', async () => {
    const mockFetch = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ result: { amount: '42' } }),
    } as any);

    const bal = await nearAdapter.getBalance('alice.testnet');
    expect(bal).toBe('42');

    mockFetch.mockRestore();
  });
});
