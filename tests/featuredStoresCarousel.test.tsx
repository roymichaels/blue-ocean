import React from 'react';
import renderer from 'react-test-renderer';
import FeaturedStoresCarousel from '@/features/home/components/FeaturedStoresCarousel';
import EmptyState from '@/shared/ui/EmptyState';

const mockPush = jest.fn();
const mockUseStores = jest.fn();

jest.mock('@/services/useStores', () => ({
  useStores: () => mockUseStores(),
}));

jest.mock('@/services/useAppRouter', () => ({
  useAppRouter: () => ({ push: mockPush }),
}));

const colors = {
  text: { primary: '#111111', secondary: '#555555' },
  surface: { primary: '#ffffff', elevated: '#f4f4f4' },
  border: { primary: '#dddddd' },
  gold: '#FFD700',
  interactive: { disabled: '#999999' },
};

jest.mock('@/ui/ThemeProvider', () => ({
  useLanguage: () => ({ t: (key: string, defaultText?: string) => defaultText ?? key }),
  useTheme: () => ({
    colors,
    getColor: (path: string) =>
      path.split('.').reduce((acc: any, key) => (acc ? acc[key] : undefined), colors),
  }),
}));

describe('FeaturedStoresCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStores.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders an empty state when there are no featured stores', () => {
    const tree = renderer.create(<FeaturedStoresCarousel />);
    const emptyState = tree.root.findByType(EmptyState);
    expect(emptyState.props.title).toBe('No featured stores yet');
  });

  it('renders store cards and opens stores on press', () => {
    mockUseStores.mockReturnValue({
      data: [
        { id: '1', name: 'Alpha Market', owner: '0xabc', reputation: 5 },
        { id: '2', name: 'Beta Shop', owner: '0xdef', reputation: 2 },
      ],
      isLoading: false,
    });

    const tree = renderer.create(<FeaturedStoresCarousel />);
    const cards = tree.root.findAll(
      (node) => node.props?.testID && node.props.testID.startsWith('featured-store-'),
    );
    expect(cards).toHaveLength(2);

    cards[0].props.onPress();
    expect(mockPush).toHaveBeenCalledWith('/store/1');
  });
});

