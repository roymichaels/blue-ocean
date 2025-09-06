import { useState, useEffect } from 'react';
import CartService from '@/features/cart/services/cart';
import { Product, PricingTier } from '@/types';
import { chainAdapter } from '@/services/chain';
import { useProduct } from './useProduct';
import { useProductPricing } from '@/services/useProductPricing';
import { useProductMedia } from '@/services/useProductMedia';
import eventBus from '@/services/eventBus';

interface ProductDetailResult {
  product: Product | null;
  isLoading: boolean;
  quantity: number;
  incrementQuantity: () => void;
  decrementQuantity: () => void;
  setQuantity: (qty: number) => void;
  effectivePrice: number;
  totalPrice: number;
  currentPricingTier: PricingTier | null;
  showTieredPricing: boolean;
  media: ReturnType<typeof useProductMedia>['media'];
  mainImageUri?: string;
  isFavorite: boolean;
  toggleFavorite: () => Promise<void>;
  updateProduct: (p: Product) => void;
  notFound: boolean;
}

export function useProductDetail(id: string): ProductDetailResult {
  const { data: fetchedProduct, isLoading } = useProduct(id);
  const address = chainAdapter.useAccountId();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const { effectivePrice, totalPrice, currentPricingTier, showTieredPricing } =
    useProductPricing(product, quantity);
  const { media, mainImageUri } = useProductMedia(product);

  useEffect(() => {
    if (isLoading) return;
    if (address && fetchedProduct && fetchedProduct.storeId !== address) {
      setNotFound(true);
      setProduct(null);
      return;
    }
    if (fetchedProduct) {
      setProduct(fetchedProduct);
      setNotFound(false);
      eventBus.track('catalog.product_view', { productId: fetchedProduct.id });
    }
  }, [fetchedProduct, isLoading, address]);

  useEffect(() => {
    if (!product) return;
    const cartService = CartService.getInstance();
    setIsFavorite(cartService.isInWishlist(product.id));

    const handleUpdate = () => {
      setIsFavorite(cartService.isInWishlist(product.id));
    };

    cartService.addListener(handleUpdate);
    return () => cartService.removeListener(handleUpdate);
  }, [product]);

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const toggleFavorite = async () => {
    if (!product) return;
    const cartService = CartService.getInstance();
    if (isFavorite) {
      await cartService.removeFromWishlist(product.id);
    } else {
      await cartService.addToWishlist(product);
    }
  };

  const updateProduct = (p: Product) => {
    setProduct(p);
  };

  return {
    product,
    isLoading,
    quantity,
    incrementQuantity,
    decrementQuantity,
    setQuantity,
    effectivePrice,
    totalPrice,
    currentPricingTier,
    showTieredPricing,
    media,
    mainImageUri,
    isFavorite,
    toggleFavorite,
    updateProduct,
    notFound,
  };
}

export default useProductDetail;
