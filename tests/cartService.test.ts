import CartService from '@/features/cart/services/cart';
import cartAgent from '../agents/cart-agent';
import DatabaseService from '../services/database';
import nearAuth from '@/features/auth/services/nearAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, WishlistItem, Product } from '../types';

jest.mock('../agents/cart-agent', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('../services/database', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

jest.mock('@/features/auth/services/nearAuth', () => ({
  __esModule: true,
  default: { getAccountId: jest.fn() },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const product: Product = {
  id: 'p1',
  name: 'Prod',
  price: 1,
  description: 'd',
  category: 'c',
  images: [],
  rating: 0,
  reviews: 0,
  storeId: 's',
  stock: 1,
};

const userCartItem: CartItem = {
  id: 'user1_ci1',
  productId: 'p1',
  product,
  quantity: 1,
  addedAt: new Date().toISOString(),
};

const anonCartItem: CartItem = {
  id: 'ci1',
  productId: 'p1',
  product,
  quantity: 1,
  addedAt: new Date().toISOString(),
};

const wishItem: WishlistItem = {
  id: 'wi1',
  productId: 'p1',
  product,
  addedAt: new Date().toISOString(),
};

describe('CartService storage', () => {
  beforeEach(() => {
    (CartService as any).instance = undefined;
    (AsyncStorage.getItem as jest.Mock).mockReset();
    (AsyncStorage.setItem as jest.Mock).mockReset();
    (cartAgent.getAll as jest.Mock).mockReset();
    (DatabaseService.getInstance as jest.Mock).mockReset();
    (nearAuth.getAccountId as jest.Mock).mockReset();
  });

  it('loads user cart and wishlist when logged in', async () => {
    (nearAuth.getAccountId as jest.Mock).mockReturnValue('user1');
    (cartAgent.getAll as jest.Mock).mockResolvedValue([userCartItem]);
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getWishlistItems: jest.fn().mockResolvedValue([wishItem]),
    });

    const svc = CartService.getInstance();
    await new Promise(r => setTimeout(r, 0));

    expect(svc.getCartItems()).toEqual([userCartItem]);
    expect(svc.getWishlistItems()).toEqual([wishItem]);
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('falls back to anonymous storage when no user', async () => {
    (nearAuth.getAccountId as jest.Mock).mockReturnValue(null);
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'cart_items') return Promise.resolve(JSON.stringify([anonCartItem]));
      if (key === 'wishlist_items') return Promise.resolve(JSON.stringify([wishItem]));
      return Promise.resolve(null);
    });

    const svc = CartService.getInstance();
    await new Promise(r => setTimeout(r, 0));

    expect(svc.getCartItems()).toEqual([anonCartItem]);
    expect(svc.getWishlistItems()).toEqual([wishItem]);
    expect(cartAgent.getAll).not.toHaveBeenCalled();
    expect(DatabaseService.getInstance).not.toHaveBeenCalled();
  });
});
