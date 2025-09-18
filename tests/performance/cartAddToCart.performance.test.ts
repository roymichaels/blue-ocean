import CartService from '@/features/cart/services/cart';
import cartAgent from '@/agents/cart-agent';
import DatabaseService from '@/services/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import eventBus from '@/services/eventBus';
import { Product } from '@/types';

jest.mock('@/agents/cart-agent', () => {
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

jest.mock('@/services/eventBus', () => {
  const track = jest.fn().mockResolvedValue(undefined);
  const publish = jest.fn().mockResolvedValue(undefined);
  return {
    __esModule: true,
    default: { track, publish },
    track,
    publish,
  };
});

jest.mock('@/services/chain', () => ({ __esModule: true,
  chainAdapter: { getAccountId: jest.fn() },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('CartService addToCart performance', () => {
  const product: Product = {
    id: 'p1',
    name: 'Perf Product',
    price: 10,
    description: 'perf',
    category: 'perf',
    images: [],
    rating: 0,
    reviews: 0,
    storeId: 'store1',
    stock: 10,
  };

  let originalPerformance: typeof globalThis.performance;
  let nowMock: jest.Mock<number, []>;
  let currentTimestamp = 0;
  let dateSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    jest.clearAllMocks();
    (CartService as any).instance = undefined;
    currentTimestamp = 0;

    originalPerformance = globalThis.performance;
    nowMock = jest.fn();
    (globalThis as any).performance = { now: nowMock } as Performance;

    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTimestamp);

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    (cartAgent.add as jest.Mock).mockResolvedValue(undefined);
    (cartAgent.update as jest.Mock).mockResolvedValue(undefined);
    (cartAgent.getCartItems as jest.Mock).mockResolvedValue([]);

    const db = {
      getProduct: jest.fn().mockResolvedValue(product),
    };
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(db);

    const { chainAdapter } = require('@/services/chain');
    (chainAdapter.getAccountId as jest.Mock).mockReturnValue(null);
  });

  afterEach(() => {
    dateSpy.mockRestore();
    if (originalPerformance) {
      globalThis.performance = originalPerformance;
    } else {
      delete (globalThis as any).performance;
    }
  });

  it('records addToCart duration within threshold and leverages cache', async () => {
    const durationSequence = [0, 90, 100, 180];
    let durationIndex = 0;
    nowMock.mockImplementation(() => {
      const value = durationSequence[durationIndex] ?? durationSequence[durationSequence.length - 1];
      durationIndex += 1;
      return value;
    });

    const dbInstance = DatabaseService.getInstance();
    const trackMock = eventBus.track as jest.Mock;
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const svc = CartService.getInstance();

    await svc.addToCart('p1', undefined, 1);

    const firstDurationCall = trackMock.mock.calls.find(([type]) => type === 'cart.add.duration');
    expect(firstDurationCall).toBeTruthy();
    expect(firstDurationCall?.[1]).toMatchObject({
      productId: 'p1',
      variantId: null,
      cached: false,
      success: true,
      slow: false,
    });
    expect(firstDurationCall?.[1].durationMs).toBeLessThanOrEqual(120);

    currentTimestamp = 50;

    await svc.addToCart('p1', undefined, 1);

    const durationCalls = trackMock.mock.calls.filter(([type]) => type === 'cart.add.duration');
    expect(durationCalls).toHaveLength(2);
    expect(durationCalls[1][1]).toMatchObject({
      productId: 'p1',
      cached: true,
      success: true,
      slow: false,
    });
    expect(durationCalls[1][1].durationMs).toBeLessThanOrEqual(120);
    expect((dbInstance as any).getProduct).toHaveBeenCalledTimes(1);
    expect(cartAgent.update).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
