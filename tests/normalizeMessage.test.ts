import { normalizeMessage } from '../lib/normalizeMessage';
import { Product, Order } from '../types';

describe('normalizeMessage', () => {
  it('accepts valid product and rejects malformed', () => {
    const good: Product = {
      id: 'p1',
      name: 'prod',
      price: 1,
      description: 'd',
      category: 'c',
      images: [],
      rating: 0,
      reviews: 0,
      storeId: 's',
      stock: 0,
    } as any; // optional fields ignored
    expect(normalizeMessage<Product>('Product', good)).toEqual(good);
    const bad = { id: 'p1', name: 'prod' } as any;
    expect(() => normalizeMessage<Product>('Product', bad)).toThrow(
      'Invalid message payload',
    );
  });

  it('accepts valid order and rejects malformed', () => {
    const good: Order = {
      id: 'o1',
      userId: 'u1',
      items: [],
      total: 0,
      status: 'order_received',
      shippingAddress: {
        name: 'n',
        phone: 'p',
        street: 's',
        city: 'c',
        postalCode: 'pc',
      },
      paymentMethod: 'cash_on_delivery',
      itemsHash: 'h',
      createdAt: 'now',
      updatedAt: 'now',
      trackingSteps: [],
    } as any;
    expect(normalizeMessage<Order>('Order', good)).toEqual(good);
    const bad = { id: 'o1' } as any;
    expect(() => normalizeMessage<Order>('Order', bad)).toThrow(
      'Invalid message payload',
    );
  });
});
