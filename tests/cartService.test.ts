import CartService from '@/features/cart/services/cart';
import cartAgent from '../agents/cart-agent';
import DatabaseService from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, WishlistItem, Product } from '../types';

jest.mock('../agents/cart-agent', () => {
  const getCartItems = jest.fn();
  return {
    __esModule: true,
    default: {
      getCartItems,
      add: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      selectCartItem: jest.fn(),
    },
    getCartItems,
    selectCartItem: jest.fn(),
  };
});

jest.mock('@/services/database', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const getAccountIdMock = jest.fn();
const mockSignIn = jest.fn().mockResolvedValue(undefined);
const mockGetPublicKey = jest.fn(() => 'pub:test');
jest.mock('@/services/chain', () => ({ __esModule: true,
  chainAdapter: { getAccountId: () => getAccountIdMock() },
}));
jest.mock('@/features/auth/services/nearAuth', () => ({
  __esModule: true,
  default: { getAccountId: getAccountIdMock },
  getAccountId: getAccountIdMock,
  getPublicKey: mockGetPublicKey,
  signIn: mockSignIn,
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
    (cartAgent.getCartItems as jest.Mock).mockReset();
    (DatabaseService.getInstance as jest.Mock).mockReset();
    getAccountIdMock.mockReset();
  });

  it('loads user cart and wishlist when logged in', async () => {
    getAccountIdMock.mockReturnValue('user1');
    (cartAgent.getCartItems as jest.Mock).mockResolvedValue([userCartItem]);
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getWishlistItems: jest.fn().mockResolvedValue([wishItem]),
    });

    const svc = CartService.getInstance();
    await (svc as any).loadFromStorage();

    expect(svc.getCartItems()).toEqual([expect.objectContaining(userCartItem)]);
    expect(svc.getWishlistItems()).toEqual([wishItem]);
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('falls back to anonymous storage when no user', async () => {
    getAccountIdMock.mockReturnValue(null);
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'cart_items') return Promise.resolve(JSON.stringify([anonCartItem]));
      if (key === 'wishlist_items') return Promise.resolve(JSON.stringify([wishItem]));
      return Promise.resolve(null);
    });

    const svc = CartService.getInstance();
    await (svc as any).loadFromStorage();

    expect(svc.getCartItems()).toEqual([expect.objectContaining(anonCartItem)]);
    expect(svc.getWishlistItems()).toEqual([wishItem]);
    expect(cartAgent.getCartItems).not.toHaveBeenCalled();
    expect(DatabaseService.getInstance).not.toHaveBeenCalled();
  });
});
