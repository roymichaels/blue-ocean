import { createCommerceClient, createMockCommerceClient, createNetworkCommerceClient } from '@/data/commerce';

const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('commerce clients', () => {
  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  it('returns mock data when mock mode is requested', async () => {
    const client = createCommerceClient('mock');
    const feed = await client.getFeed();
    expect(feed.heroStore).toBeDefined();
    expect(feed.featuredStores.length).toBeGreaterThan(0);
  });

  it('falls back to mock data when live mode cannot reach a server', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'));
    const client = createNetworkCommerceClient({ mode: 'live', baseUrl: 'https://example.com/api' });
    const orders = await client.getOrders();
    expect(orders.length).toBeGreaterThan(0);
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('resolves search results', async () => {
    const client = createMockCommerceClient();
    const result = await client.search('soba');
    expect(result.products.some((product) => product.id === 'soba-salad')).toBe(true);
  });
});
