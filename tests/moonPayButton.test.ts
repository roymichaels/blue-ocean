import React from 'react';
import renderer, { act } from 'react-test-renderer';
import MoonPayButton from '@/features/payments/components/MoonPayButton';

jest.mock('../contexts/ThemeContext', () => ({
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

const modalMock = jest.fn(({ visible, amountTON, amountUSD }: any) =>
  visible ? React.createElement('MoonPayModal', { amountTON, amountUSD }) : null,
);

jest.mock('@/features/payments/components/MoonPayModal', () => ({
  __esModule: true,
  default: (props: any) => modalMock(props),
}));

describe('MoonPayButton', () => {
  afterEach(() => {
    if (global.fetch) {
      (global.fetch as jest.Mock).mockRestore?.();
    }
  });

  it('computes TON amount and renders modal', async () => {
    const { useAppInfo } = require('../contexts/AppInfoContext');
    (useAppInfo as jest.Mock).mockReturnValue({
      fiatKey: 'key',
      setFiatKey: jest.fn(),
    });

    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ 'the-open-network': { usd: 2 } }) }),
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
    expect(call && call[0].amountTON).toBe(3);
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

