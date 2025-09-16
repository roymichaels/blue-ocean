import React, { StrictMode } from 'react';
import renderer, { act } from 'react-test-renderer';

const mockTrack = jest.fn();
const productFixture: any = {
  id: 'product-1',
  storeId: 'default',
  stock: 10,
  price: 25,
};

jest.mock('@/services/eventBus', () => ({
  __esModule: true,
  default: { track: mockTrack },
  track: mockTrack,
  publish: jest.fn(),
}));

const mockUseProduct = jest.fn();
jest.mock('@/features/products/hooks/useProduct', () => ({
  useProduct: (...args: any[]) => mockUseProduct(...args),
}));

const mockUseProductPricing = jest.fn();
jest.mock('@/services/useProductPricing', () => ({
  __esModule: true,
  useProductPricing: (...args: any[]) => mockUseProductPricing(...args),
  default: (...args: any[]) => mockUseProductPricing(...args),
}));

const mockUseProductMedia = jest.fn();
jest.mock('@/services/useProductMedia', () => ({
  __esModule: true,
  useProductMedia: (...args: any[]) => mockUseProductMedia(...args),
  default: (...args: any[]) => mockUseProductMedia(...args),
}));

const mockCartInstance: any = {
  isInWishlist: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};
const mockGetInstance = jest.fn(() => mockCartInstance);

jest.mock('@/features/cart/services/cart', () => ({
  __esModule: true,
  default: { getInstance: () => mockGetInstance() },
}));

import { useProductDetail } from '@/features/products/hooks/useProductDetail';

describe('useProductDetail analytics tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrack.mockResolvedValue(undefined);

    mockUseProduct.mockImplementation(() => ({
      data: productFixture,
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
      error: null,
    }));

    mockUseProductPricing.mockReturnValue({
      effectivePrice: 25,
      totalPrice: 25,
      currentPricingTier: null,
      showTieredPricing: false,
    });

    mockUseProductMedia.mockReturnValue({
      media: [],
      mainImageUri: undefined,
    });

    mockCartInstance.isInWishlist.mockReturnValue(false);
    mockCartInstance.addListener.mockImplementation(() => {});
    mockCartInstance.removeListener.mockImplementation(() => {});
  });

  it('fires analytics event once when product loads', async () => {
    const TestComponent = () => {
      useProductDetail(productFixture.id, productFixture.storeId);
      return null;
    };

    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(
        React.createElement(
          StrictMode as any,
          null,
          React.createElement(TestComponent),
        ),
      );
    });

    await act(async () => {});

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('analytics.view.product', {
      productId: productFixture.id,
    });

    await act(async () => {
      root.unmount();
    });
  });
});
