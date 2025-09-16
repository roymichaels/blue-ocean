import React from 'react';
import renderer from 'react-test-renderer';
import HomeServices from '@/features/home/components/HomeServices';

const mockServiceCard = jest.fn(() => null);
jest.mock('@/features/home/components/ServiceCard', () => ({
  __esModule: true,
  default: (props: any) => {
    mockServiceCard(props);
    return null;
  },
}));

const mockUseLanguage = { t: (key: string, defaultText?: string) => defaultText ?? key };
const mockUseTheme = {
  colors: {
    gold: '#FFD700',
    text: { primary: '#000', secondary: '#333' },
  },
};

jest.mock('@/ui/ThemeProvider', () => ({
  useLanguage: () => mockUseLanguage,
  useTheme: () => mockUseTheme,
}));

const mockAppRouter = { push: jest.fn() };
jest.mock('@/services/useAppRouter', () => ({
  useAppRouter: () => mockAppRouter,
}));

const mockUseAuth = jest.fn();
jest.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseStores = jest.fn();
jest.mock('@/services/useStores', () => ({
  useStores: () => mockUseStores(),
}));

describe('HomeServices create store visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      user: { id: '0xabc', address: '0xabc' },
    });
    mockUseStores.mockReturnValue({ data: [] });
  });

  it('renders create store card when admin owns no stores', () => {
    renderer.create(<HomeServices />);
    const createStoreCards = (mockServiceCard.mock.calls as any[]).filter(
      (args) => args?.[0]?.testID === 'create-store-link',
    );
    expect(createStoreCards).toHaveLength(1);
  });

  it('hides create store card when admin already owns a store', () => {
    mockUseStores.mockReturnValue({
      data: [
        {
          id: '1',
          name: 'Storefront',
          owner: '0xabc',
        },
      ],
    });
    renderer.create(<HomeServices />);
    const createStoreCards = (mockServiceCard.mock.calls as any[]).filter(
      (args) => args?.[0]?.testID === 'create-store-link',
    );
    expect(createStoreCards).toHaveLength(0);
  });
});
