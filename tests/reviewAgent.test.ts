import { Review } from '../types';

const store: Record<string, Review[]> = {};

jest.mock('@/features/reviews/services/nearReviews', () => ({
  getReviews: jest.fn(async (productId: string) => store[productId] || []),
  addReview: jest.fn(async (review: Review) => {
    const arr = store[review.productId] || [];
    arr.push(review);
    store[review.productId] = arr;
  }),
}));

const orders: Record<string, any> = {
  o1: {
    id: 'o1',
    userId: 'u1',
    status: 'delivered',
    items: [{ productId: 'p1', product: { id: 'p1', name: 'p1', price: 1, description: '', category: '', images: [], rating: 0, reviews: 0, storeId: 's1', stock: 1 } }],
  },
};

jest.mock('../agents/orders-agent', () => ({
  get: jest.fn(async (id: string) => orders[id] || null),
}));

jest.mock('../agents/products-agent', () => ({
  get: jest.fn(async () => ({ id: 'p1', storeId: 's1' })),
}));

jest.mock('../agents/stores-agent', () => ({
  recordReview: jest.fn(async () => {}),
}));

jest.mock('@/features/auth/services/nearAuth', () => ({
  getAccountId: jest.fn().mockReturnValue('user1'),
  signIn: jest.fn(),
}));

import reviewAgent from '../agents/review-agent';

describe('reviewAgent', () => {
  const base: Review = {
    id: 'r1',
    productId: 'p1',
    productName: 'Prod',
    productImage: 'img',
    orderId: 'o1',
    userId: 'u1',
    userName: 'Alice',
    userAvatar: 'a',
    rating: 5,
    title: 'Great',
    comment: 'Nice',
    date: new Date().toISOString(),
    helpful: 0,
    verified: true,
  };

  it('adds a review when order is delivered', async () => {
    await reviewAgent.add(base);
    const res = await reviewAgent.getByProduct('p1');
    expect(res).toHaveLength(1);
    expect(res[0].rating).toBe(5);
  });

  it('prevents duplicate reviews from same user', async () => {
    await expect(reviewAgent.add({ ...base, id: 'r2' })).rejects.toThrow(
      'Duplicate review',
    );
  });

  it('rejects review if order not delivered', async () => {
    orders.o2 = {
      id: 'o2',
      userId: 'u1',
      status: 'courier_on_way',
      items: orders.o1.items,
    };
    await expect(
      reviewAgent.add({ ...base, id: 'r3', orderId: 'o2' }),
    ).rejects.toThrow('Only completed orders can be reviewed');
  });
});

