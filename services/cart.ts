import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, WishlistItem, Product } from '../types';

const CART_STORAGE_KEY = 'cart_items';
const WISHLIST_STORAGE_KEY = 'wishlist_items';

class CartService {
  private static instance: CartService;
  private cartItems: CartItem[] = [];
  private wishlistItems: WishlistItem[] = [];
  private listeners: (() => void)[] = [];

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
      const [cartData, wishlistData] = await Promise.all([
        AsyncStorage.getItem(CART_STORAGE_KEY),
        AsyncStorage.getItem(WISHLIST_STORAGE_KEY)
      ]);

      if (cartData) {
        this.cartItems = JSON.parse(cartData);
      }
      if (wishlistData) {
        this.wishlistItems = JSON.parse(wishlistData);
      }
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading cart/wishlist from storage:', error);
    }
  }

  private async saveToStorage() {
    try {
      await Promise.all([
        AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.cartItems)),
        AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(this.wishlistItems))
      ]);
    } catch (error) {
      console.error('Error saving cart/wishlist to storage:', error);
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

  // Cart methods
  public async addToCart(product: Product, quantity: number = 1): Promise<void> {
    const existingItemIndex = this.cartItems.findIndex(
      item => item.productId === product.id
    );

    if (existingItemIndex >= 0) {
      this.cartItems[existingItemIndex].quantity += quantity;
    } else {
      const cartItem: CartItem = {
        id: `${product.id}_${Date.now()}`,
        productId: product.id,
        product,
        quantity,
        addedAt: new Date().toISOString()
      };
      this.cartItems.push(cartItem);
    }

    await this.saveToStorage();
    this.notifyListeners();
  }

  public async removeFromCart(itemId: string): Promise<void> {
    this.cartItems = this.cartItems.filter(item => item.id !== itemId);
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
        await this.saveToStorage();
        this.notifyListeners();
      }
    }
  }

  public async clearCart(): Promise<void> {
    this.cartItems = [];
    await this.saveToStorage();
    this.notifyListeners();
  }

  public getCartItems(): CartItem[] {
    return [...this.cartItems];
  }

  public getCartTotal(): number {
    return this.cartItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
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
    await this.saveToStorage();
    this.notifyListeners();
  }

  public async removeFromWishlist(productId: string): Promise<void> {
    this.wishlistItems = this.wishlistItems.filter(item => item.productId !== productId);
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