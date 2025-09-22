import { createMockCommerceClient } from '@/data/commerce/mockClient';

describe('mock commerce client', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns feed data with hero store and categories', async () => {
    const client = createMockCommerceClient();
    const promise = client.getFeed();
    jest.runAllTimers();
    const result = await promise;
    expect(result.heroStore).toBeTruthy();
    expect(result.quickCategories.length).toBeGreaterThan(0);
  });

  it('searches stores and products with case-insensitive matching', async () => {
    const client = createMockCommerceClient();
    const promise = client.search('matcha');
    jest.runAllTimers();
    const result = await promise;
    expect(result.stores.length + result.products.length).toBeGreaterThan(0);
  });
});
