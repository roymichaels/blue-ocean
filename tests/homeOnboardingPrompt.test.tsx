import React from 'react';
import renderer, { act } from 'react-test-renderer';

const InfoModalMock = jest.fn(() => null);
jest.mock('@/components/InfoModal', () => (props: any) => {
  InfoModalMock(props);
  return null;
});

const mockUseLanguage = { t: (s: string, d?: string) => d || s };
const mockUseTheme = {
  colors: {
    text: { primary: '#000', secondary: '#333' },
    gold: '#FFD700',
    surface: { primary: '#fff', elevated: '#eee' },
  },
};
jest.mock('@/ui/ThemeProvider', () => ({
  useLanguage: () => mockUseLanguage,
  useTheme: () => mockUseTheme,
}));

const mockAppRouter = { push: jest.fn() };
jest.mock('@/hooks/useAppRouter', () => ({ useAppRouter: () => mockAppRouter }));

const mockWallet = { address: '0xabc', connect: jest.fn() };
jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => mockWallet,
}));

const mockUseStores = jest.fn();
jest.mock('@/hooks/useStores', () => ({
  useStores: () => mockUseStores(),
}));

import HomeOptions from '@/features/home/components/HomeOptions';

describe('HomeOptions store onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows prompt when user has no store', async () => {
    mockUseStores.mockReturnValue({ data: [] });
    await act(async () => {
      renderer.create(<HomeOptions />);
    });
    expect(InfoModalMock).toHaveBeenCalled();
    const props = InfoModalMock.mock.calls[0][0];
    expect(props.visible).toBe(true);
  });

  it('does not show prompt when user owns a store', async () => {
    mockUseStores.mockReturnValue({ data: [{ id: '1', owner: '0xabc', name: 'S' }] });
    await act(async () => {
      renderer.create(<HomeOptions />);
    });
    expect(InfoModalMock).not.toHaveBeenCalled();
  });
});
