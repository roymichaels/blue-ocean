import { errorLog } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, WishlistItem, Product, PricingTier, PricingTierRule, MixGroup } from '@/types';
import DatabaseService from '@/services/database';
import cartAgent, { getCartItems } from '@/agents/cart-agent';
import eventBus from '@/services/eventBus';
import { chainAdapter } from '@/services/chain';
 

const CART_STORAGE_KEY = 'cart_items';
const WISHLIST_STORAGE_KEY = 'wishlist_items';

class CartService {
  private static instance: CartService;
  private cartItems: CartItem[] = [];
  private wishlistItems: WishlistItem[] = [];
  private listeners: (() => void)[] = [];
  private tierCache: Record<string, PricingTier> = {};
  private groupCache: Record<string, MixGroup> = {};

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const addr = chainAdapter.getAccountId?.();
      return addr ?? null;
    } catch (err) {
      errorLog('Failed to get current user', err);
      return null;
    }
  }

  public static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  constructor() {
    this.loadFromStorage();
  }

  private async loadFromStorage() {
    try {
      const uid = await this.getCurrentUserId();

      if (uid) {
        try {
          const all = await getCartItems();
          this.cartItems = all.filter((it) => it.id.startsWith(`${uid}_`));
        } catch (err) {
          errorLog('Error fetching cart from storage:', err);
        }

        const db = DatabaseService.getInstance();
        try {
          this.wishlistItems = await db.getWishlistItems(uid);
        } catch (err) {
          errorLog('Error fetching wishlist from DB:', err);
        }
      } else {
        const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (cartData) {
          this.cartItems = JSON.parse(cartData);
        }

        const wishlistData = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
        if (wishlistData) {
          this.wishlistItems = JSON.parse(wishlistData);
        }
      }

      await this.recalcPricing();
      this.notifyListeners();
    } catch (error) {
      errorLog('Error loading cart/wishlist from storage:', error);
    }
  }

  private async saveToStorage() {
    try {
      const uid = await this.getCurrentUserId();
      if (!uid) {
        await AsyncStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify(this.cartItems)
        );
        await AsyncStorage.setItem(
          WISHLIST_STORAGE_KEY,
          JSON.stringify(this.wishlistItems)
        );
      }
    } catch (error) {
      errorLog('Error saving cart/wishlist to storage:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  public addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  public removeListener(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private async getPricingTier(id: string): Promise<PricingTier | null> {
    if (!id) return null;
    if (!this.tierCache[id]) {
      const db = DatabaseService.getInstance();
      const tier = await db.getPricingTier(id);
      if (tier) this.tierCache[id] = tier;
    }
    return this.tierCache[id] || null;
  }

  private async getMixGroup(id: string): Promise<MixGroup | null> {
    if (!id) return null;
    if (!this.groupCache[id]) {
      const db = DatabaseService.getInstance();
      const group = await db.getMixGroup(id);
      if (group) this.groupCache[id] = group;
    }
    return this.groupCache[id] || null;
  }

  private async recalcPricing(): Promise<void> {
    const combos: Record<string, CartItem[]> = {};

    for (const item of this.cartItems) {
      const key = `${item.product.mixGroupId || 'none'}|${item.product.pricingTier || 'none'}`;
      if (!combos[key]) combos[key] = [];
      combos[key].push(item);
    }

    for (const key of Object.keys(combos)) {
      const items = combos[key];
      if (items.length === 0) continue;
      const mixGroupId = items[0].product.mixGroupId || '';
      const tierId = items[0].product.pricingTier || '';

      const group = await this.getMixGroup(mixGroupId);
      const tier = await this.getPricingTier(tierId);

      const conversionFactor = group?.conversionFactor ?? 1;
      const effectiveQty = items.reduce((sum, it) => sum + it.quantity * conversionFactor, 0);

      let rule: PricingTierRule | undefined;
      if (tier?.rules && tier.rules.length > 0) {
        rule = tier.rules.find(r => effectiveQty >= r.minQty && effectiveQty <= r.maxQty);
        if (!rule) {
          rule = tier.rules
            .filter(r => effectiveQty >= r.minQty)
            .sort((a, b) => b.minQty - a.minQty)[0];
        }
      }

      for (const it of items) {
        it.effectiveQty = effectiveQty;
        it.tierName = rule ? tier?.name : undefined;

        if (rule?.pricePerBaseUnit !== undefined && rule.pricePerBaseUnit !== null) {
          it.unitPrice = rule.pricePerBaseUnit * conversionFactor;
        } else if (rule?.discountPct !== undefined && rule.discountPct !== null) {
          it.unitPrice = it.product.price * (1 - rule.discountPct / 100);
        } else {
          it.unitPrice = it.product.price;
        }
      }
    }
  }

  // Cart methods
  public async addToCart(product: Product, quantity: number = 1): Promise<void> {
    const existingItemIndex = this.cartItems.findIndex(
      item => item.productId === product.id
    );

    if (existingItemIndex >= 0) {
      this.cartItems[existingItemIndex].quantity += quantity;
      await cartAgent.update(this.cartItems[existingItemIndex]);
    } else {
      const uid = await this.getCurrentUserId();
      const cartItem: CartItem = {
        id: `${uid ? uid + '_' : ''}${product.id}_${Date.now()}`,
        productId: product.id,
        product,
        quantity,
        addedAt: new Date().toISOString()
      };
      this.cartItems.push(cartItem);
      await cartAgent.add(cartItem);
    }
    eventBus.track('cart.add', { productId: product.id, quantity });
    await this.recalcPricing();
    await this.saveToStorage();
    this.notifyListeners();
  }

  public async removeFromCart(itemId: string): Promise<void> {
    this.cartItems = this.cartItems.filter(item => item.id !== itemId);
    await cartAgent.remove(itemId);
    eventBus.track('cart.remove', { itemId });
    await this.recalcPricing();
    await this.saveToStorage();
    this.notifyListeners();
  }

  public async updateCartItemQuantity(itemId: string, quantity: number): Promise<void> {
    const itemIndex = this.cartItems.findIndex(item => item.id === itemId);
    if (itemIndex >= 0) {
      if (quantity <= 0) {
        await this.removeFromCart(itemId);
      } else {
        this.cartItems[itemIndex].quantity = quantity;
        await cartAgent.update(this.cartItems[itemIndex]);
        eventBus.track('cart.update', { itemId, quantity });
        await this.recalcPricing();
        await this.saveToStorage();
        this.notifyListeners();
      }
    }
  }

  public async clearCart(): Promise<void> {
    const uid = await this.getCurrentUserId();
    this.cartItems = [];
    const allItems = await getCartItems();
    for (const item of allItems) {
      if (!uid || item.id.startsWith(`${uid}_`)) {
        await cartAgent.remove(item.id);
      }
    }
    eventBus.track('cart.clear');
    await this.recalcPricing();
    await this.saveToStorage();
    this.notifyListeners();
  }

  public getCartItems(): CartItem[] {
    return [...this.cartItems];
  }

  public getCartTotal(): number {
    return this.cartItems.reduce((total, item) => {
      const price = item.unitPrice ?? item.product.price;
      return total + price * item.quantity;
    }, 0);
  }

  public getCartItemsCount(): number {
    return this.cartItems.reduce((count, item) => count + item.quantity, 0);
  }

  // Wishlist methods
  public async addToWishlist(product: Product): Promise<void> {
    const existingItem = this.wishlistItems.find(item => item.productId === product.id);
    if (existingItem) return; // Already in wishlist

    const wishlistItem: WishlistItem = {
      id: `${product.id}_${Date.now()}`,
      productId: product.id,
      product,
      addedAt: new Date().toISOString()
    };

    this.wishlistItems.push(wishlistItem);

    const uid = await this.getCurrentUserId();
    if (uid) {
      const db = DatabaseService.getInstance();
      try {
        await db.addWishlistItem(uid, product.id);
      } catch (err) {
        errorLog('Error saving wishlist item:', err);
      }
    }

    await this.saveToStorage();
    this.notifyListeners();
  }

  public async removeFromWishlist(productId: string): Promise<void> {
    this.wishlistItems = this.wishlistItems.filter(item => item.productId !== productId);

    const uid = await this.getCurrentUserId();
    if (uid) {
      const db = DatabaseService.getInstance();
      try {
        await db.removeWishlistItem(uid, productId);
      } catch (err) {
        errorLog('Error removing wishlist item:', err);
      }
    }

    await this.saveToStorage();
    this.notifyListeners();
  }

  public getWishlistItems(): WishlistItem[] {
    return [...this.wishlistItems];
  }

  public isInWishlist(productId: string): boolean {
    return this.wishlistItems.some(item => item.productId === productId);
  }

  public getWishlistItemsCount(): number {
    return this.wishlistItems.length;
  }
}

export default CartService;
