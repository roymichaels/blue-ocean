import { productDeletedSchema, parseProductDeletedMessage } from '../schemas/waku/product.deleted';

describe('product.deleted schema', () => {
  test('valid message parses', () => {
    const msg = {
      type: 'product.deleted',
      payload: {
        id: 'p1',
        storeId: 's1',
        deletedAt: '2024-01-01T00:00:00Z',
        ts: 1700000000000,
        nonce: 'abcdef123456',
      },
      sender: { publicKey: '0xabc' },
      signature: '0x123',
    } as const;
    expect(productDeletedSchema.parse(msg)).toEqual(msg);
    expect(parseProductDeletedMessage(msg)).toEqual(msg);
  });

  test('invalid message fails', () => {
    const bad = {
      type: 'product.deleted',
      payload: { id: 'p1' },
      sender: { publicKey: '0xabc' },
      signature: '0x123',
    } as const;
    expect(() => productDeletedSchema.parse(bad)).toThrow();
    expect(parseProductDeletedMessage(bad)).toBeNull();
  });
});
