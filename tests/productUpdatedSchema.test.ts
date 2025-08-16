import { productUpdatedSchema, parseProductUpdatedMessage } from '../schemas/waku/product.updated';

describe('product.updated schema', () => {
  const product = {
    id: 'p1',
    name: 'Widget',
    price: 10,
    description: 'A great widget',
    category: 'tools',
    images: ['ipfs://img'],
    rating: 5,
    reviews: 1,
    storeId: 's1',
    stock: 3,
  };

  test('valid message parses', () => {
    const msg = {
      type: 'product.updated',
      payload: product,
      sender: { publicKey: '0xabc' },
      signature: '0x123',
    };
    expect(productUpdatedSchema.parse(msg)).toEqual(msg);
    expect(parseProductUpdatedMessage(msg)).toEqual(msg);
  });

  test('invalid message fails', () => {
    const bad = {
      type: 'product.updated',
      payload: { id: 'p1' },
      sender: { publicKey: '0xabc' },
      signature: '0x123',
    };
    expect(() => productUpdatedSchema.parse(bad)).toThrow();
    expect(parseProductUpdatedMessage(bad)).toBeNull();
  });
});
