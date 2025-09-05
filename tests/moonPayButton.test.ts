import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { MoonPayButton } from '@/features/payments';

jest.mock('@/ui/ThemeProvider', () => ({
  useTheme: () => ({ colors: { gold: 'gold', text: { inverse: '#fff' } } }),
}));

jest.mock('../contexts/AppInfoContext', () => ({
  useAppInfo: jest.fn(),
}));

jest.mock('@/features/auth/services/nearAuth', () => ({
  __esModule: true,
  default: { signIn: jest.fn() },
  useAccountId: jest.fn(() => 'addr'),
}));

const modalMock = jest.fn(({ visible, amountNEAR, amountUSD }: any) =>
  visible ? React.createElement('MoonPayModal', { amountNEAR, amountUSD }) : null,
);

jest.mock('@/features/payments', () => {
  const actual = jest.requireActual('@/features/payments');
  return { ...actual, MoonPayModal: (props: any) => modalMock(props) };
});

describe('MoonPayButton', () => {
  afterEach(() => {
    if (global.fetch) {
      (global.fetch as jest.Mock).mockRestore?.();
    }
  });

  it('computes NEAR amount and renders modal', async () => {
    const { useAppInfo } = require('../contexts/AppInfoContext');
    (useAppInfo as jest.Mock).mockReturnValue({
      fiatKey: 'key',
      setFiatKey: jest.fn(),
    });

    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ near: { usd: 2 } }) }),
    ) as any;

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(React.createElement(MoonPayButton, { usdAmount: 6 }));
    });
    const button = root!.root.findByProps({ testID: 'moonpay-button' });
    await act(async () => {
      await button.props.onPress();
    });
    const call = modalMock.mock.calls.find((c) => c[0].visible);
    expect(call && call[0].amountNEAR).toBe(3);
  });

  it('renders nothing without moonpay key', async () => {
    const { useAppInfo } = require('../contexts/AppInfoContext');
    (useAppInfo as jest.Mock).mockReturnValue({
      fiatKey: undefined,
      setFiatKey: jest.fn(),
    });

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(React.createElement(MoonPayButton, { usdAmount: 6 }));
    });
    expect(root!.toJSON()).toBeNull();
  });
});

