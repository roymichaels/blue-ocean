// @ts-nocheck
import usersAgent from '../agents/users-agent';
import categoriesAgent from '../agents/categories-agent';
import productsAgent from '../agents/products-agent';
import ordersAgent from '../agents/orders-agent';
import cartAgent from '../agents/cart-agent';
import SettingsAgent from '../agents/settings-agent';
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
} from '../types';

class DatabaseService {
  private static instance: DatabaseService;

  private heroBanners: Map<string, HeroBanner> = new Map();
  private pricingTiers: Map<string, PricingTier> = new Map();
  private mixGroups: Map<string, MixGroup> = new Map();
  private reviews: Map<string, Review> = new Map();
  private chatRooms: Map<string, ChatRoom> = new Map();
  private chatMessages: Map<string, ChatMessage[]> = new Map();
  private wishlist: Record<string, WishlistItem[]> = {};
  private deliveryJobs: Map<string, DeliveryJob> = new Map();

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async getUserProfile(id: string): Promise<User | null> {
    return usersAgent.get(id) || null;
  }

  async updateUserRole(userId: string, role: 'user' | 'driver' | 'admin'): Promise<void> {
    const user = await this.getUserProfile(userId);
    if (!user) return;
    user.role = role;
    await usersAgent.update(user);
  }

  async getCategories(): Promise<Category[]> {
    return categoriesAgent.getAll();
  }

  async addCategory(category: Omit<Category, 'subcategories'> & { subcategories?: Category['subcategories'] }): Promise<void> {
    await categoriesAgent.add({ ...category, subcategories: category.subcategories });
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<void> {
    const existing = categoriesAgent.get(id);
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
    return productsAgent.getAll();
  }

  async getProduct(id: string): Promise<Product | null> {
    return productsAgent.get(id) || null;
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<string> {
    const id = `prod_${Date.now()}`;
    const full: Product = { id, ...product } as Product;
    await productsAgent.add(full);
    return id;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const existing = productsAgent.get(id);
    if (!existing) return;
    await productsAgent.update({ ...existing, ...data });
  }

  async deleteProduct(id: string): Promise<void> {
    await productsAgent.remove(id);
  }

  // Subcategories
  async addSubcategory(sub: Subcategory): Promise<void> {
    const cat = categoriesAgent.get(sub.categoryId);
    if (!cat) return;
    cat.subcategories = cat.subcategories || [];
    cat.subcategories.push(sub);
    await categoriesAgent.update(cat);
  }

  async updateSubcategory(id: string, data: Partial<Subcategory>): Promise<void> {
    for (const cat of categoriesAgent.getAll()) {
      const idx = cat.subcategories?.findIndex(s => s.id === id) ?? -1;
      if (idx >= 0 && cat.subcategories) {
        cat.subcategories[idx] = { ...cat.subcategories[idx], ...data };
        await categoriesAgent.update(cat);
        return;
      }
    }
  }

  async deleteSubcategory(id: string): Promise<void> {
    for (const cat of categoriesAgent.getAll()) {
      const before = cat.subcategories?.length || 0;
      cat.subcategories = cat.subcategories?.filter(s => s.id !== id);
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

  async updatePricingTier(id: string, data: Partial<PricingTier>): Promise<void> {
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

  async addHeroBanner(banner: Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `banner_${Date.now()}`;
    const now = new Date().toISOString();
    const full: HeroBanner = { id, createdAt: now, updatedAt: now, ...banner } as HeroBanner;
    this.heroBanners.set(id, full);
    return id;
  }

  async updateHeroBanner(id: string, data: Partial<HeroBanner>): Promise<void> {
    const existing = this.heroBanners.get(id);
    if (!existing) return;
    this.heroBanners.set(id, { ...existing, ...data, updatedAt: new Date().toISOString() });
  }

  async deleteHeroBanner(id: string): Promise<void> {
    this.heroBanners.delete(id);
  }

  // Reviews
  async getReviews(): Promise<Review[]> {
    return Array.from(this.reviews.values());
  }

  async addReview(review: Review): Promise<void> {
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
    return ordersAgent.getAll().filter(o => o.userId === userId);
  }

  async getAllUserProfiles(): Promise<User[]> {
    return usersAgent.getAll();
  }

  async searchUserProfiles(query: string): Promise<User[]> {
    return usersAgent
      .getAll()
      .filter(u => u.displayName?.toLowerCase().includes(query.toLowerCase()));
  }

  async updateUserCustomerTier(userId: string, tier: string): Promise<void> {
    const user = usersAgent.get(userId);
    if (!user) return;
    (user as any).customerTier = tier;
    await usersAgent.update(user);
  }

  async updateUserKycStatus(userId: string, status: string, adminId?: string): Promise<boolean> {
    const user = usersAgent.get(userId);
    if (!user) return false;
    (user as any).kycStatus = status as any;
    (user as any).kycApprovedBy = adminId;
    await usersAgent.update(user);
    return true;
  }

  async getPendingKycRequests(): Promise<User[]> {
    return usersAgent.getAll().filter(u => (u as any).kycStatus === 'pending');
  }

  // Chat
  async getChatRooms(): Promise<ChatRoom[]> {
    return Array.from(this.chatRooms.values());
  }

  async getOrCreateChatRoom(
    userId: string,
    userName: string,
    userPublicKey?: string,
  ): Promise<string> {
    for (const room of this.chatRooms.values()) {
      if (room.userId === userId) {
        if (userPublicKey) room.userPublicKey = userPublicKey;
        return room.id;
      }
    }
    const id = `room_${Date.now()}`;
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
    return this.chatMessages.get(roomId) || [];
  }

  async sendChatMessage(roomId: string, msg: ChatMessage): Promise<void> {
    const msgs = this.chatMessages.get(roomId) || [];
    msgs.push(msg);
    this.chatMessages.set(roomId, msgs);
    const room = this.chatRooms.get(roomId);
    if (room) {
      room.lastMessage = msg.message;
      room.lastMessageTime = msg.timestamp;
      room.unreadCount += 1;
      this.chatRooms.set(roomId, room);
    }
  }

  async updateMessageReactions(id: string, reactions: Record<string, string[]>): Promise<void> {
    for (const [roomId, msgs] of this.chatMessages) {
      const idx = msgs.findIndex(m => m.id === id);
      if (idx >= 0) {
        msgs[idx] = { ...msgs[idx], reactions };
        this.chatMessages.set(roomId, msgs);
        return;
      }
    }
  }

  // Wishlist
  async getWishlistItems(userId: string): Promise<WishlistItem[]> {
    return this.wishlist[userId] || [];
  }

  async addWishlistItem(userId: string, productId: string): Promise<void> {
    const list = this.wishlist[userId] || [];
    if (list.some(w => w.productId === productId)) return;
    const product = productsAgent.get(productId);
    if (!product) return;
    list.push({
      id: `${productId}_${Date.now()}`,
      productId,
      product,
      addedAt: new Date().toISOString(),
    });
    this.wishlist[userId] = list;
  }

  async removeWishlistItem(userId: string, productId: string): Promise<void> {
    const list = this.wishlist[userId] || [];
    this.wishlist[userId] = list.filter(w => w.productId !== productId);
  }

  // Delivery jobs
  async getAllDeliveryJobs(): Promise<DeliveryJob[]> {
    return Array.from(this.deliveryJobs.values());
  }

  async getDeliveryJobsForDriver(driverId: string): Promise<DeliveryJob[]> {
    return Array.from(this.deliveryJobs.values()).filter(j => j.driverId === driverId);
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

  async updateDeliveryJobStatus(id: string, status: DeliveryJob['status']): Promise<void> {
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
