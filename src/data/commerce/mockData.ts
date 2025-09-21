import type { CommerceFeed, MessagePreview, Order, Product, Store } from './types';

const baseImage = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=1200&q=80`;

export const products: Product[] = [
  {
    id: 'espresso-tonic',
    name: 'Citrus Espresso Tonic',
    description: 'Single-origin espresso poured over tonic with burnt citrus and rosemary.',
    heroImage: baseImage('photo-1504753793650-d4a2b783c15e'),
    price: { amount: 6.5, currency: 'USD' },
    rating: 4.9,
    ratingCount: 428,
    deliveryEstimateMinutes: 18,
    isNew: true,
    tags: ['coffee', 'seasonal'],
  },
  {
    id: 'bao-box',
    name: 'Night Market Bao Box',
    description: 'Six steamed bao with miso-braised mushrooms and chili crisp.',
    heroImage: baseImage('photo-1548943487-a2e4e43b4853'),
    price: { amount: 14.0, currency: 'USD' },
    rating: 4.8,
    ratingCount: 512,
    deliveryEstimateMinutes: 26,
    tags: ['street food', 'vegan'],
  },
  {
    id: 'soba-salad',
    name: 'Yuzu Soba Salad',
    description: 'Cold buckwheat noodles with shaved vegetables, toasted sesame, and yuzu dressing.',
    heroImage: baseImage('photo-1525755662778-989d0524087e'),
    price: { amount: 12.5, currency: 'USD' },
    rating: 4.7,
    ratingCount: 292,
    deliveryEstimateMinutes: 22,
    tags: ['light', 'signature'],
  },
  {
    id: 'sourdough-kit',
    name: '72h Sourdough Kit',
    description: 'A starter-friendly kit with stone-milled flour, recipe, and video walkthrough.',
    heroImage: baseImage('photo-1511690743698-d9d85f2fbf38'),
    price: { amount: 18.0, currency: 'USD' },
    rating: 4.9,
    ratingCount: 189,
    deliveryEstimateMinutes: 0,
    tags: ['pantry', 'baking'],
  },
  {
    id: 'matcha-drops',
    name: 'Ceremonial Matcha Drops',
    description: 'Individually sealed matcha shots sourced from Uji cooperatives.',
    heroImage: baseImage('photo-1504674900247-0877df9cc836'),
    price: { amount: 9.5, currency: 'USD' },
    rating: 4.6,
    ratingCount: 351,
    deliveryEstimateMinutes: 14,
    tags: ['tea', 'wellness'],
  },
];

export const stores: Store[] = [
  {
    id: 'midnight-garden',
    name: 'Midnight Garden',
    tagline: 'Late-night botanical bar & pantry',
    heroImage: baseImage('photo-1470337458703-46ad1756a187'),
    rating: 4.9,
    distanceMinutes: 5,
    categories: ['coffee', 'dessert', 'cocktails'],
    openNow: true,
    featuredProductIds: ['espresso-tonic', 'matcha-drops'],
  },
  {
    id: 'kinoko',
    name: 'Kinoko Deli',
    tagline: 'Everyday Japanese comfort delivered warm',
    heroImage: baseImage('photo-1504674900247-0877df9cc836'),
    rating: 4.8,
    distanceMinutes: 11,
    categories: ['bento', 'noodles', 'street food'],
    openNow: true,
    featuredProductIds: ['bao-box', 'soba-salad'],
  },
  {
    id: 'wild-grains',
    name: 'Wild Grains Bakery',
    tagline: 'Slow-fermented breads and pantry staples',
    heroImage: baseImage('photo-1542838132-92c53300491e'),
    rating: 4.95,
    distanceMinutes: 8,
    categories: ['bakery', 'pantry'],
    openNow: false,
    featuredProductIds: ['sourdough-kit'],
  },
];

export const orders: Order[] = [
  {
    id: 'ORD-2201',
    placedAt: new Date().toISOString(),
    status: 'processing',
    total: { amount: 28.5, currency: 'USD' },
    fulfillmentEtaMinutes: 24,
    items: [
      {
        productId: 'bao-box',
        name: 'Night Market Bao Box',
        quantity: 1,
        price: { amount: 14.0, currency: 'USD' },
      },
      {
        productId: 'soba-salad',
        name: 'Yuzu Soba Salad',
        quantity: 1,
        price: { amount: 12.5, currency: 'USD' },
      },
    ],
  },
  {
    id: 'ORD-2198',
    placedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    status: 'completed',
    total: { amount: 18.0, currency: 'USD' },
    items: [
      {
        productId: 'sourdough-kit',
        name: '72h Sourdough Kit',
        quantity: 1,
        price: { amount: 18.0, currency: 'USD' },
      },
    ],
  },
];

export const messages: MessagePreview[] = [
  {
    id: 'msg-midnight',
    storeId: 'midnight-garden',
    storeName: 'Midnight Garden',
    lastMessage: 'Your citrus espresso tonic is being bottled now. Ready in 10!',
    unreadCount: 2,
    updatedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
  {
    id: 'msg-kinoko',
    storeId: 'kinoko',
    storeName: 'Kinoko Deli',
    lastMessage: 'Thanks for the review! New soba arriving tomorrow morning.',
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: 'msg-wild',
    storeId: 'wild-grains',
    storeName: 'Wild Grains Bakery',
    lastMessage: 'Starter class livestream link is in your inbox. See you Sunday!',
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
  },
];

export const feed: CommerceFeed = {
  heroStore: stores[0],
  featuredStores: stores,
  trendingProducts: products,
  quickCategories: ['Coffee', 'Bento', 'Vegan', 'Trending', 'Pantry'],
};
