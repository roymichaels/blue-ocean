import React from 'react';
import renderer, { act } from 'react-test-renderer';
import SearchScreen from '@app/search';
import type { Order, Product, Store, ChatRoom, ChatMessage } from '@/types';

jest.mock('expo-secure-store');

const mockPush = jest.fn();
const mockRefreshNotifications = jest.fn();

const themeColors = {
  background: '#fff',
  canvas: '#fff',
  surface: { primary: '#f5f5f5' },
  border: { primary: '#e0e0e0', focus: '#1976d2' },
  text: { primary: '#111', secondary: '#666', tertiary: '#999', inverse: '#fff' },
  gold: '#ffc107',
};

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => ({ colors: themeColors, getColor: () => '#111' }),
  useLanguage: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    isRTL: false,
    currentLanguage: 'en',
    setLanguage: jest.fn(),
  }),
}));

jest.mock('@/contexts/TenantContext', () => ({
  useTenant: () => ({ tenantId: 'default', isNetwork: false }),
}));

jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => ({ address: 'buyer.near' }),
}));

jest.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: () => ({ currencySymbol: '₪' }),
}));

jest.mock('@/services/useAppRouter', () => ({
  useAppRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(),
  }),
}));

jest.mock('@/components/NotificationContext', () => ({
  useNotificationState: () => ({
    unreadCount: 0,
    refreshNotifications: mockRefreshNotifications,
  }),
}));

jest.mock('@/components/UserAvatar', () => () => null);

jest.mock('@/components/CommandPalette', () => () => null);
jest.mock('@/components/GadgetLabConsole', () => () => null);

const sampleProducts: Product[] = [
  {
    id: 'product-espresso',
    tenant_id: 'default',
    name: 'Espresso Machine',
    price: 499,
    description: 'Compact espresso maker',
    category: 'kitchen',
    images: [],
    rating: 4.5,
    reviews: 10,
    storeId: 'store-a',
    stock: 3,
  },
  {
    id: 'product-milk',
    tenant_id: 'default',
    name: 'Fresh Milk',
    price: 12,
    description: 'Local dairy milk',
    category: 'grocery',
    images: [],
    rating: 4.0,
    reviews: 5,
    storeId: 'store-b',
    stock: 10,
  },
];

const sampleStores: Store[] = [
  {
    id: 'store-a',
    name: 'Coffee Hub',
    owner: 'owner.near',
    nftId: 'nft1',
    reputation: 0.92,
    plan: 'premium',
  },
  {
    id: 'store-b',
    name: 'Daily Goods',
    owner: 'seller.near',
    nftId: 'nft2',
    reputation: 0.65,
    plan: 'free',
  },
];

const baseCartItem = {
  id: 'cart-1',
  quantity: 1,
  addedAt: '2023-01-01T00:00:00.000Z',
  productId: 'product-espresso',
  product: sampleProducts[0],
};

const sampleOrders: Order[] = [
  {
    id: 'order-open',
    tenant_id: 'default',
    userId: 'buyer.near',
    items: [baseCartItem],
    total: 499,
    status: 'order_received',
    paymentMethod: 'near',
    shippingAddress: {
      name: 'Buyer',
      phone: '123',
      street: 'Main',
      city: 'Tel Aviv',
      postalCode: '00000',
    },
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    trackingSteps: [],
    buyerAddress: 'buyer.near',
  },
  {
    id: 'order-closed',
    tenant_id: 'default',
    userId: 'buyer.near',
    items: [baseCartItem],
    total: 120,
    status: 'delivered',
    paymentMethod: 'near',
    shippingAddress: {
      name: 'Buyer',
      phone: '123',
      street: 'Main',
      city: 'Tel Aviv',
      postalCode: '00000',
    },
    createdAt: '2022-12-25T00:00:00.000Z',
    updatedAt: '2022-12-26T00:00:00.000Z',
    trackingSteps: [],
    buyerAddress: 'buyer.near',
  },
];

const sampleRooms: ChatRoom[] = [
  {
    id: 'room-support',
    userId: 'support.near',
    userName: 'Support',
    lastMessage: 'We are here to help',
    lastMessageTime: Date.now(),
    unreadCount: 0,
  },
];

const sampleMessages: Record<string, ChatMessage[]> = {
  'room-support': [
    {
      id: 'msg-1',
      senderId: 'support.near',
      senderName: 'Support Agent',
      message: 'How can we assist with your espresso machine? ',
      timestamp: Date.now() - 1_000,
      isAdmin: true,
    },
    {
      id: 'msg-2',
      senderId: 'buyer.near',
      senderName: 'Buyer',
      message: 'My order arrived damaged',
      timestamp: Date.now(),
      isAdmin: false,
    },
  ],
};

let latestTextFieldProps: any = null;

jest.mock('@/ui/primitives/TextField', () => ({
  __esModule: true,
  default: jest.fn((props) => {
    latestTextFieldProps = props;
    return null;
  }),
}));

jest.mock('@/ui/primitives/Divider', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/services/useProducts', () => ({
  useProducts: () => ({ data: sampleProducts }),
}));

jest.mock('@/services/useStores', () => ({
  useStores: () => ({ data: sampleStores }),
}));

const ordersWarmCacheMock = {
  list: jest.fn((predicate?: (id: string, value: Order) => boolean) => {
    if (typeof predicate === 'function') {
      return sampleOrders.filter((order) => predicate(order.id, order));
    }
    return sampleOrders;
  }),
  subscribe: jest.fn(() => () => {}),
  mutate: jest.fn(),
  getById: jest.fn(),
};

jest.mock('@/services/nearOrders', () => ({
  ordersWarmCache: ordersWarmCacheMock,
}));

const mockDatabase = {
  getChatRooms: jest.fn(async () => sampleRooms),
  getChatMessages: jest.fn(async (roomId: string) => sampleMessages[roomId] ?? []),
};

jest.mock('@/services/database', () => ({
  __esModule: true,
  default: { getInstance: () => mockDatabase },
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, {
    get: (_target, prop) => {
      return (props: any) => React.createElement('Icon', { ...props, name: String(prop) });
    },
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  latestTextFieldProps = null;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function getResultPressables(root: renderer.ReactTestRendererJSON | renderer.ReactTestRenderer) {
  const tree = (root as any).root ?? root;
  return tree.findAll(
    (node: any) => node.props?.testID && String(node.props.testID).startsWith('search-result-'),
  );
}

describe('SearchScreen', () => {
  it('returns relevant product matches', async () => {
    let testRenderer: renderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = renderer.create(<SearchScreen />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestTextFieldProps).toBeTruthy();
    await act(async () => {
      latestTextFieldProps.onChangeText('espresso');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    const results = getResultPressables(testRenderer!);
    expect(results[0]?.props?.testID).toBe('search-result-products-product-espresso');
  });

  it('applies order status filters', async () => {
    const testRenderer = renderer.create(<SearchScreen />);
    await act(async () => {
      await Promise.resolve();
    });

    const root = testRenderer.root;
    const ordersTab = root.find((node) => node.props?.testID === 'search-tab-orders');
    await act(async () => {
      ordersTab.props.onPress();
      jest.advanceTimersByTime(80);
    });

    const openFilter = root.find((node) => node.props?.testID === 'search-filter-orders-open');
    await act(async () => {
      openFilter.props.onPress();
      jest.advanceTimersByTime(100);
    });

    const results = getResultPressables(testRenderer);
    const resultIds = results.map((node: any) => node.props?.testID);
    expect(resultIds).toEqual(['search-result-orders-order-open']);
  });

  it('does not trigger network fetch during queries', async () => {
    const originalFetch = global.fetch;
    const mockFetch = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = mockFetch;

    await act(async () => {
      renderer.create(<SearchScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      latestTextFieldProps.onChangeText('support');
    });
    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();

    (global as any).fetch = originalFetch;
  });
});
