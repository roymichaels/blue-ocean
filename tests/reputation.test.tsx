import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('@/features/stores/services/nearStores', () => ({
  getStore: jest.fn(async (id: string) => ({ id, name: 'Store', owner: 'owner1', nftId: 'n1', reputation: 0 })),
  setStore: jest.fn(async () => {}),
  listStores: jest.fn(async () => [{ id: 's1', name: 'Store', owner: 'owner1', nftId: 'n1', reputation: 0 }]),
  removeStore: jest.fn(),
}));

jest.mock('@/features/auth/services/nearAuth', () => ({
  getAccountId: jest.fn().mockReturnValue('addr'),
  signIn: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ storeId: 's1' }),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      surface: { primary: '#fff' },
      text: { primary: '#000', secondary: '#666', tertiary: '#999', inverse: '#fff' },
      border: { primary: '#000' },
      gold: '#ff0',
      status: { warning: 'orange', error: 'red' },
      interactive: { secondary: '#eee' },
    },
  }),
}));

jest.mock('../components/NotificationContext', () => ({
  useNotifications: () => ({ showNotification: jest.fn() }),
}));

jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ isAdmin: true, isDriver: false, user: { id: 'u1' } }),
}));

jest.mock('@/features/auth/AuthModalContext', () => ({
  useAuthModal: () => ({ openAuthModal: jest.fn() }),
}));

jest.mock('../services/database', () => ({
  getInstance: () => ({
    getProducts: jest.fn(async () => []),
    getChatRooms: jest.fn(async () => []),
    getReviews: jest.fn(async () => []),
    getPendingKycRequests: jest.fn(async () => []),
    getAllUserProfiles: jest.fn(async () => []),
  }),
}));

jest.mock('../services/notification', () => ({
  getInstance: () => ({ getNotifications: jest.fn(async () => []) }),
}));

jest.mock('../agents/moderation-agent', () => ({
  getAll: jest.fn(async () => []),
  reportStore: jest.fn(),
}));

jest.mock('../agents/products-agent', () => ({ remove: jest.fn() }));

jest.mock('../components/InfoModal', () => () => null);
jest.mock('@/shared/ui/Spinner', () => () => null);

// minimal mocks for unused components
jest.mock('@/features/products/ProductCard', () => ({ __esModule: true, default: () => null }));

import storesAgent from '../agents/stores-agent';
import StorefrontStoreScreen from '../app/store/[storeId]';
import AdminDashboardScreen from '../app/admin/dashboard';

describe('store reputation', () => {
  it('aggregates reviews and orders into reputation score', async () => {
    await storesAgent.recordReview('s1', 4);
    expect(storesAgent.getReputationScore('s1')).toBeCloseTo(2);
    await storesAgent.updateReputationByOwner('owner1', 1);
    expect(storesAgent.getReputationScore('s1')).toBeCloseTo(4.5);
  });

  it('displays reputation score in storefront and admin dashboard', async () => {
    jest.spyOn(storesAgent, 'get').mockResolvedValue({ id: 's1', name: 'Store', owner: 'owner1', nftId: 'n1', reputation: 0 } as any);
    jest.spyOn(storesAgent, 'getAll').mockResolvedValue([{ id: 's1', name: 'Store', owner: 'owner1', nftId: 'n1', reputation: 0 }] as any);
    jest.spyOn(storesAgent, 'getReputationScore').mockReturnValue(4.5);
    jest.spyOn(storesAgent, 'subscribe').mockImplementation(() => {});
    jest.spyOn(storesAgent, 'unsubscribe').mockImplementation(() => {});

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<StorefrontStoreScreen />);
    });
    expect(JSON.stringify(root!.toJSON())).toContain('4.5');

    let adminRoot: renderer.ReactTestRenderer;
    await act(async () => {
      adminRoot = renderer.create(<AdminDashboardScreen />);
    });
    expect(JSON.stringify(adminRoot!.toJSON())).toContain('4.5');
  });
});

