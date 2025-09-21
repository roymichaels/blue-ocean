import React from 'react';
import renderer from 'react-test-renderer';
import StoreCreation from '@/features/stores/components/StoreCreation';

jest.mock('@/services', () => ({
  useAppRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

jest.mock('@/ui/ThemeProvider', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

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
  useWallet: () => ({ address: '0x123456', connect: jest.fn() }),
}));

jest.mock('@/utils/logger', () => ({
  errorLog: jest.fn(),
}));

const ReactNative = require('react-native');
(ReactNative as any).Button = ({
  title,
  onPress,
  color,
  disabled,
}: {
  title: string;
  onPress?: () => void;
  color?: string;
  disabled?: boolean;
}) =>
  React.createElement('Button', {
    title,
    onPress,
    color,
    disabled,
  });

describe('StoreCreation snapshot', () => {
  beforeEach(() => {
    mockDatabase.updateUserRole.mockClear();
  });

  it('renders without premium plan controls', () => {
    const tree = renderer.create(<StoreCreation />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
