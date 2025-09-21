import React from 'react';
import renderer, { act } from 'react-test-renderer';
import {
  StoreCreationContent,
  type MintProgressState,
  type MintResult,
} from '@/features/stores/components/StoreCreation';

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

jest.mock('@/services', () => ({
  useAppRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@/agents/stores-agent', () => ({
  add: jest.fn(),
}));

const mockDatabase = { updateUserRole: jest.fn() };

jest.mock('@/services/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockDatabase,
  },
}));

jest.mock('@/components/NotificationContext', () => ({
  useNotificationActions: () => ({ showNotification: jest.fn() }),
}));

jest.mock('@/features/stores/services/nearStores', () => ({
  __esModule: true,
  createStoreOnChain: jest.fn(),
  createDefaultStoreServiceDeps: jest.fn(() => ({})),
}));

jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => ({ address: 'owner.testnet', connect: jest.fn() }),
}));

jest.mock('@/utils/logger', () => ({
  errorLog: jest.fn(),
}));

describe('StoreCreationContent', () => {
  beforeEach(() => {
    mockDatabase.updateUserRole.mockClear();
  });

  it('calls connect wallet when CTA is pressed', () => {
    const onConnect = jest.fn();
    const tree = renderer.create(
      <StoreCreationContent
        owner={null}
        onConnectWallet={onConnect}
        onMint={jest.fn(async () => ({
          storeId: 'mock',
          storeName: 'Mock',
          owner: 'owner.testnet',
        }))}
        onViewAdmin={jest.fn()}
      />,
    );

    const connectButton = tree.root.findByProps({ testID: 'store-creation-connect' }) as any;
    act(() => {
      connectButton.props.onPress();
    });

    expect(onConnect).toHaveBeenCalled();
  });

  it('advances to confirmation when identity details are valid', async () => {
    const tree = renderer.create(
      <StoreCreationContent
        owner="owner.testnet"
        onConnectWallet={jest.fn()}
        onMint={jest.fn(async () => ({
          storeId: 'mock',
          storeName: 'Mock',
          owner: 'owner.testnet',
        }))}
        onViewAdmin={jest.fn()}
      />,
    );

    const nameInput = tree.root.findByProps({ testID: 'store-creation-name' }) as any;
    await act(async () => {
      nameInput.props.onChangeText?.('Aurora Market');
    });

    const primary = tree.root.findByProps({ testID: 'store-creation-primary' }) as any;
    await act(async () => {
      await primary.props.onPress?.();
    });

    const confirmationStep = tree.root.findAllByProps({ testID: 'store-creation-step-confirmation' });
    expect(confirmationStep).toHaveLength(1);
  });

  it('mints the store and exposes success state', async () => {
    const onMint = jest.fn(
      async (
        values: { name: string; owner: string },
        updateProgress: (state: MintProgressState) => void,
      ): Promise<MintResult> => {
        updateProgress({ status: 'submitting' });
        updateProgress({ status: 'success', txHash: 'near:hash' });
        return {
          storeId: 'minted-store',
          storeName: values.name.trim(),
          owner: values.owner,
          txHash: 'near:hash',
        };
      },
    );
    const onViewAdmin = jest.fn();

    const tree = renderer.create(
      <StoreCreationContent
        owner="owner.testnet"
        onConnectWallet={jest.fn()}
        onMint={onMint}
        onViewAdmin={onViewAdmin}
      />,
    );

    const nameInput = tree.root.findByProps({ testID: 'store-creation-name' }) as any;
    await act(async () => {
      nameInput.props.onChangeText?.('Aurora Market');
    });

    let primary = tree.root.findByProps({ testID: 'store-creation-primary' }) as any;
    await act(async () => {
      await primary.props.onPress?.();
    });

    primary = tree.root.findByProps({ testID: 'store-creation-primary' }) as any;
    await act(async () => {
      await primary.props.onPress?.();
    });

    expect(onMint).toHaveBeenCalledWith(
      { name: 'Aurora Market', owner: 'owner.testnet' },
      expect.any(Function),
    );

    expect(() => tree.root.findByProps({ testID: 'store-creation-step-success' })).not.toThrow();
    const progress = tree.root.findByProps({ testID: 'store-creation-progress' });
    expect(progress.props.children).toBe('Success! Redirecting to admin…');

    primary = tree.root.findByProps({ testID: 'store-creation-primary' }) as any;
    await act(async () => {
      await primary.props.onPress?.();
    });

    expect(onViewAdmin).toHaveBeenCalledWith('minted-store');
  });
});

