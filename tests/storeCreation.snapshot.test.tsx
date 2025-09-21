import React from 'react';
import renderer from 'react-test-renderer';
import StoreCreation from '@/features/stores/components/StoreCreation';

jest.mock('@/services', () => ({
  useAppRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@/ui/ThemeProvider', () => {
  const colors = {
    canvas: '#111111',
    surface: { primary: '#1A1A1A', secondary: '#222222', elevated: '#2A2A2A' },
    text: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      tertiary: '#888888',
      inverse: '#000000',
    },
    border: { primary: '#333333', focus: '#B99C5A' },
    status: {
      success: '#4CAF50',
      warning: '#FFC107',
      error: '#FF3B30',
      info: '#4D96FF',
    },
    interactive: {
      primary: '#B99C5A',
      primaryHover: '#A08A52',
      secondary: '#3A2F1F',
      disabled: '#555555',
    },
    gold: '#B99C5A',
  };
  return {
    useLanguage: () => ({
      t: (key: string, options?: Record<string, string | number> | string) => {
        if (typeof options === 'string') {
          return options;
        }
        if (options && typeof options === 'object') {
          if ('step' in options) {
            return `Step ${options.step} of 3`;
          }
          if ('owner' in options) {
            return `Owner: ${options.owner}`;
          }
          if ('tx' in options) {
            return `Transaction hash: ${options.tx}`;
          }
        }
        return key;
      },
      isRTL: false,
    }),
    useTheme: () => ({ colors }),
  };
});

jest.mock('@/agents/stores-agent', () => ({
  add: jest.fn(),
}));

const mockDatabase = {
  updateUserRole: jest.fn(),
};

jest.mock('@/services/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockDatabase,
  },
}));

jest.mock('@/components/NotificationContext', () => ({
  useNotificationActions: () => ({ showNotification: jest.fn() }),
}));

jest.mock('@/features/stores/services/nearStores', () => {
  const createStream = (stores: any[] = []) => {
    const stream: any = {
      read: jest.fn().mockResolvedValue(stores),
      getSnapshot: jest.fn(() => stores),
      subscribe: jest.fn(() => jest.fn()),
      onError: jest.fn(() => jest.fn()),
    };
    stream[Symbol.asyncIterator] = jest.fn(() => ({
      next: jest.fn().mockResolvedValue({ value: stores, done: false }),
      return: jest.fn().mockResolvedValue({ value: undefined, done: true }),
      throw: jest.fn(),
    }));
    return stream;
  };
  const createStoreOnChain = jest.fn();
  const selectStore = jest.fn();
  const setStore = jest.fn();
  const service = {
    mintStore: jest.fn(),
    selectStore,
    listStores: jest.fn(() => createStream()),
    addStore: jest.fn(),
    updateStore: jest.fn(),
    removeStore: jest.fn(),
    setStore,
    createStoreOnChain,
  };
  return {
    __esModule: true,
    createStoreOnChain,
    getStore: selectStore,
    listStores: service.listStores,
    setStore,
    createDefaultStoreServiceDeps: jest.fn(() => ({})),
    createStoreService: jest.fn(() => service),
    storesWarmCache: {
      getById: jest.fn(),
      list: jest.fn(() => []),
      subscribe: jest.fn(() => jest.fn()),
      mutate: jest.fn(),
      onSynced: jest.fn(() => jest.fn()),
    },
  };
});

jest.mock('@/services/chain', () => ({ __esModule: true,
  chainAdapter: { getAccountId: jest.fn() },
}));

jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => ({ address: 'owner.testnet', connect: jest.fn() }),
}));

jest.mock('@/utils/logger', () => ({
  errorLog: jest.fn(),
}));

describe('StoreCreation snapshot', () => {
  beforeEach(() => {
    mockDatabase.updateUserRole.mockClear();
  });

  it('renders the multi-step wizard', () => {
    const tree = renderer.create(<StoreCreation />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
