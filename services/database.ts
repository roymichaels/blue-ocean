// @ts-nocheck
import { errorLog } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import usersAgent from '../agents/users-agent';
import categoriesAgent, {
  getCategories as fetchCategories,
  selectCategory as fetchCategory,
} from '../agents/categories-agent';
import productsAgent, {
  getProducts as fetchProducts,
  selectProduct as fetchProduct,
} from '../agents/products-agent';
import ordersAgent from '../agents/orders-agent';
import SettingsAgent from '../agents/settings-agent';
import reviewAgent from '../agents/review-agent';
import chain, { chainAdapter } from '@/services/chain';
import { getPrivateKey } from '@/services/localIdentity';
import { aesEncrypt, aesDecrypt } from '@/utils/encryption';
import { sha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';

let listAllReviews: (() => Promise<Review[]>) | undefined;
if (chain === 'near') {
  ({ listAllReviews } = require('@/features/reviews/services/nearReviews'));
}
import {
  User,
  Category,
  Subcategory,
  Product,
  PricingTier,
  MixGroup,
  HeroBanner,
  Review,
  ChatRoom,
  ChatMessage,
  DeliveryJob,
  Order,
  WishlistItem,
  CustomerTier,
  KycStatus,
  UserRole,
} from '../types';

const CHAT_MESSAGE_LIMIT = 50;
const CHAT_STORAGE_PREFIX = 'chat_messages_';
const WISHLIST_STORAGE_PREFIX = 'wishlist_';

class DatabaseService {
  private static instance: DatabaseService;

  private heroBanners: Map<string, HeroBanner> = new Map<string, HeroBanner>();
  private pricingTiers: Map<string, PricingTier> = new Map<
    string,
    PricingTier
  >();
  private mixGroups: Map<string, MixGroup> = new Map<string, MixGroup>();
  private reviews: Map<string, Review> = new Map<string, Review>();
  private chatRooms: Map<string, ChatRoom> = new Map<string, ChatRoom>();
  private chatMessages: Map<string, ChatMessage[]> = new Map<
    string,
    ChatMessage[]
  >();
  private wishlist: Record<string, WishlistItem[]> = {};
  private deliveryJobs: Map<string, DeliveryJob> = new Map<
    string,
    DeliveryJob
  >();

  private constructor() {}

  /**
   * Derive a symmetric key from the device's private identity key and the
   * current wallet/account. This prevents one wallet from reading another
   * wallet's data on the same device.
   */
  private async getEncryptionKey(scope?: string): Promise<CryptoKey> {
    const priv = await getPrivateKey();
    const acct = scope || chainAdapter.getAccountId() || 'anon';
    const material = sha256(
      Buffer.concat([Buffer.from(priv), Buffer.from(acct)]),
    );
    return crypto.subtle.importKey(
      'raw',
      material,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  private async loadWishlist(userId: string): Promise<WishlistItem[]> {
    if (!this.wishlist[userId]) {
      try {
        const raw = await AsyncStorage.getItem(
          `${WISHLIST_STORAGE_PREFIX}${userId}`,
        );
        if (raw) {
          const key = await this.getEncryptionKey(userId);
          const dec = await aesDecrypt(raw, key);
          this.wishlist[userId] = JSON.parse(dec) as WishlistItem[];
        } else {
          this.wishlist[userId] = [];
        }
      } catch {
        this.wishlist[userId] = [];
      }
    }
    return this.wishlist[userId];
  }

  private async persistWishlist(userId: string): Promise<void> {
    const list = this.wishlist[userId] || [];
    try {
      const key = await this.getEncryptionKey(userId);
      const enc = await aesEncrypt(JSON.stringify(list), key);
      await AsyncStorage.setItem(
        `${WISHLIST_STORAGE_PREFIX}${userId}`,
        enc,
      );
    } catch (err) {
      errorLog('Failed to persist wishlist', err);
    }
  }

  private async cacheChatMessages(
    roomId: string,
    msgs: ChatMessage[],
  ): Promise<void> {
    const trimmed = msgs.slice(-CHAT_MESSAGE_LIMIT);
    this.chatMessages.set(roomId, trimmed);
    try {
      const key = await this.getEncryptionKey();
      const payload = await aesEncrypt(JSON.stringify(trimmed), key);
      await AsyncStorage.setItem(`${CHAT_STORAGE_PREFIX}${roomId}`, payload);
    } catch (err) {
      errorLog('Failed to persist chat messages', err);
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async getUserProfile(id: string): Promise<User | null> {
    return usersAgent.get(id) || null;
  }

  async updateUserRole(
    userId: string,
    role: UserRole,
  ): Promise<void> {
    const user = await this.getUserProfile(userId);
    if (!user) return;
    user.role = role;
    await usersAgent.update(user);
  }

  async getCategories(): Promise<Category[]> {
    return fetchCategories();
  }

  async addCategory(
    category: Omit<Category, 'subcategories'> & {
      subcategories?: Category['subcategories'];
    },
  ): Promise<void> {
    await categoriesAgent.add({
      ...category,
      subcategories: category.subcategories,
    });
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<void> {
    const existing = await fetchCategory(id);
    if (!existing) return;
    await categoriesAgent.update({ ...existing, ...data });
  }

  async deleteCategory(id: string): Promise<void> {
    await categoriesAgent.remove(id);
  }

  async getSetting(key: string): Promise<string | null> {
    const item = SettingsAgent.getInstance().get(key);
    return item ? item.value : null;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await SettingsAgent.getInstance().set(key, value);
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return fetchProducts();
  }

  async getProduct(id: string): Promise<Product | null> {
    return fetchProduct(id);
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<string> {
    const id = `prod_${Date.now()}`;
    const full: Product = { id, ...product };
    await productsAgent.add(full);
    return id;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const existing = await fetchProduct(id);
    if (!existing) return;
    await productsAgent.update({ ...existing, ...data });
  }

  async deleteProduct(id: string): Promise<void> {
    await productsAgent.remove(id);
  }

  // Subcategories
  async addSubcategory(sub: Subcategory): Promise<void> {
    const cat = await fetchCategory(sub.categoryId);
    if (!cat) return;
    cat.subcategories = cat.subcategories || [];
    cat.subcategories.push(sub);
    await categoriesAgent.update(cat);
  }

  async updateSubcategory(
    id: string,
    data: Partial<Subcategory>,
  ): Promise<void> {
    const cats = await fetchCategories();
    for (const cat of cats) {
      const idx = cat.subcategories?.findIndex((s) => s.id === id) ?? -1;
      if (idx >= 0 && cat.subcategories) {
        cat.subcategories[idx] = { ...cat.subcategories[idx], ...data };
        await categoriesAgent.update(cat);
        return;
      }
    }
  }

  async deleteSubcategory(id: string): Promise<void> {
    const cats = await fetchCategories();
    for (const cat of cats) {
      const before = cat.subcategories?.length || 0;
      cat.subcategories = cat.subcategories?.filter((s) => s.id !== id);
      if ((cat.subcategories?.length || 0) !== before) {
        await categoriesAgent.update(cat);
        return;
      }
    }
  }

  // Pricing tiers
  async getPricingTiers(): Promise<PricingTier[]> {
    return Array.from(this.pricingTiers.values());
  }

  async getPricingTier(id: string): Promise<PricingTier | null> {
    return this.pricingTiers.get(id) || null;
  }

  async addPricingTier(tier: PricingTier): Promise<void> {
    this.pricingTiers.set(tier.id, tier);
  }

  async updatePricingTier(
    id: string,
    data: Partial<PricingTier>,
  ): Promise<void> {
    const existing = this.pricingTiers.get(id);
    if (!existing) return;
    this.pricingTiers.set(id, { ...existing, ...data });
  }

  async deletePricingTier(id: string): Promise<void> {
    this.pricingTiers.delete(id);
  }

  async getMixGroup(id: string): Promise<MixGroup | null> {
    return this.mixGroups.get(id) || null;
  }

  // Hero banners
  async getHeroBanners(): Promise<HeroBanner[]> {
    return Array.from(this.heroBanners.values());
  }

  async addHeroBanner(
    banner: Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const id = `banner_${Date.now()}`;
    const now = new Date().toISOString();
    const full: HeroBanner = { id, createdAt: now, updatedAt: now, ...banner };
    this.heroBanners.set(id, full);
    return id;
  }

  async updateHeroBanner(id: string, data: Partial<HeroBanner>): Promise<void> {
    const existing = this.heroBanners.get(id);
    if (!existing) return;
    this.heroBanners.set(id, {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteHeroBanner(id: string): Promise<void> {
    this.heroBanners.delete(id);
  }

  // Reviews
  async getReviews(): Promise<Review[]> {
    if (this.reviews.size === 0 && listAllReviews) {
      const all = await listAllReviews();
      all.forEach((r) => this.reviews.set(r.id, r));
    }
    return Array.from(this.reviews.values());
  }

  async addReview(review: Review): Promise<void> {
    await reviewAgent.add(review);
    this.reviews.set(review.id, review);
  }

  async updateReview(id: string, data: Partial<Review>): Promise<void> {
    const existing = this.reviews.get(id);
    if (!existing) return;
    this.reviews.set(id, { ...existing, ...data });
  }

  async deleteReview(id: string): Promise<void> {
    this.reviews.delete(id);
  }

  // Orders
  async getUserOrders(userId: string): Promise<Order[]> {
    return ordersAgent.getAll().filter((o) => o.userId === userId);
  }

  async getAllUserProfiles(): Promise<User[]> {
    return usersAgent.getAll();
  }

  async searchUserProfiles(
    query: string,
  ): Promise<Pick<User, 'id' | 'username' | 'displayName' | 'chatPublicKey'>[]> {
    return usersAgent
      .getAll()
      .filter((u) =>
        u.displayName?.toLowerCase().includes(query.toLowerCase()),
      )
      .map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        chatPublicKey: u.chatPublicKey,
      }));
  }

  async updateUserCustomerTier(
    userId: string,
    tier: CustomerTier,
  ): Promise<void> {
    const user = usersAgent.get(userId);
    if (!user) return;
    user.customerTier = tier;
    await usersAgent.update(user);
  }

  async updateUserKycStatus(
    userId: string,
    status: KycStatus,
    adminId?: string,
  ): Promise<boolean> {
    const user = usersAgent.get(userId);
    if (!user) return false;
    user.kycStatus = status;
    user.kycApprovedBy = adminId;
    await usersAgent.update(user);
    return true;
  }

  async getPendingKycRequests(): Promise<User[]> {
    return usersAgent.getAll().filter((u) => u.kycStatus === 'pending');
  }

  // Chat
  async getChatRooms(): Promise<ChatRoom[]> {
    return Array.from(this.chatRooms.values());
  }

  async getOrCreateChatRoom(
    userId: string,
    userName: string,
    userPublicKey?: string,
    roomId?: string,
  ): Promise<string> {
    for (const room of this.chatRooms.values()) {
      if (
        (roomId && room.id === roomId) ||
        (!roomId && room.userId === userId)
      ) {
        if (userPublicKey) room.userPublicKey = userPublicKey;
        return room.id;
      }
    }
    const id = roomId || `room_${Date.now()}`;
    this.chatRooms.set(id, {
      id,
      userId,
      userName,
      userPublicKey,
      lastMessage: '',
      lastMessageTime: Date.now(),
      unreadCount: 0,
    });
    return id;
  }

  async markChatRoomRead(id: string): Promise<void> {
    const room = this.chatRooms.get(id);
    if (room) {
      room.unreadCount = 0;
      this.chatRooms.set(id, room);
    }
  }

  async getChatMessages(roomId: string): Promise<ChatMessage[]> {
    let msgs = this.chatMessages.get(roomId);
    if (!msgs) {
      try {
        const raw = await AsyncStorage.getItem(`${CHAT_STORAGE_PREFIX}${roomId}`);
        if (raw) {
          const key = await this.getEncryptionKey();
          const dec = await aesDecrypt(raw, key);
          msgs = JSON.parse(dec) as ChatMessage[];
        } else {
          msgs = [];
        }
      } catch {
        msgs = [];
      }
      await this.cacheChatMessages(roomId, msgs);
    }
    return msgs;
  }

  async sendChatMessage(roomId: string, msg: ChatMessage): Promise<void> {
    const msgs = this.chatMessages.get(roomId) || [];
    msgs.push(msg);
    await this.cacheChatMessages(roomId, msgs);
    const room = this.chatRooms.get(roomId);
    if (room) {
      room.lastMessage = msg.message;
      room.lastMessageTime = msg.timestamp;
      room.unreadCount += 1;
      this.chatRooms.set(roomId, room);
    }
  }

  async updateMessageReactions(
    id: string,
    reactions: Record<string, string[]>,
  ): Promise<void> {
    for (const [roomId, msgs] of this.chatMessages) {
      const idx = msgs.findIndex((m) => m.id === id);
      if (idx >= 0) {
        msgs[idx] = { ...msgs[idx], reactions };
        await this.cacheChatMessages(roomId, msgs);
        return;
      }
    }
  }

  // Wishlist
  async getWishlistItems(userId: string): Promise<WishlistItem[]> {
    return this.loadWishlist(userId);
  }

  async addWishlistItem(userId: string, productId: string): Promise<void> {
    const list = await this.loadWishlist(userId);
    if (list.some((w) => w.productId === productId)) return;
    const product = await fetchProduct(productId);
    if (!product) return;
    list.push({
      id: `${productId}_${Date.now()}`,
      productId,
      product,
      addedAt: new Date().toISOString(),
    });
    this.wishlist[userId] = list;
    await this.persistWishlist(userId);
  }

  async removeWishlistItem(userId: string, productId: string): Promise<void> {
    const list = await this.loadWishlist(userId);
    this.wishlist[userId] = list.filter((w) => w.productId !== productId);
    await this.persistWishlist(userId);
  }

  // Delivery jobs
  async getAllDeliveryJobs(): Promise<DeliveryJob[]> {
    return Array.from(this.deliveryJobs.values());
  }

  async getDeliveryJobsForDriver(driverId: string): Promise<DeliveryJob[]> {
    return Array.from(this.deliveryJobs.values()).filter(
      (j) => j.driverId === driverId,
    );
  }

  async createDeliveryJob(orderId: string, driverId: string): Promise<string> {
    const id = `job_${Date.now()}`;
    const now = new Date().toISOString();
    this.deliveryJobs.set(id, {
      id,
      orderId,
      driverId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  async updateDeliveryJobStatus(
    id: string,
    status: DeliveryJob['status'],
  ): Promise<void> {
    const job = this.deliveryJobs.get(id);
    if (!job) return;
    job.status = status;
    job.updatedAt = new Date().toISOString();
    this.deliveryJobs.set(id, job);
  }

  async updateDeliveryJobProof(id: string, uri: string): Promise<void> {
    const job = this.deliveryJobs.get(id);
    if (!job) return;
    job.proofUri = uri;
    job.updatedAt = new Date().toISOString();
    this.deliveryJobs.set(id, job);
  }
}

export default DatabaseService;
