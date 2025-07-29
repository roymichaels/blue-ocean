import { executeSql } from '../lib/sqlite';
import { sendWakuSettingsUpdate } from '../lib/waku/sendWakuSettingsUpdate';
import { sendWakuUserUpdate } from '../lib/waku/sendWakuUserUpdate';
import { sendWakuProductUpdate } from '../lib/waku/sendWakuProductUpdate';
import { getTenant } from '../constants/tenant';
import { requireConfig } from '../utils/env';
import {
  Product,
  Category,
  Subcategory,
  ChatMessage,
  ChatRoom,
  User,
  Notification,
  Review,
  HeroBanner,
  PricingTier,
  PricingTierRule,
  MixGroup,
  WishlistItem,
  DeliveryJob,
  DeliveryJobStatus,
} from '../types';

class DatabaseService {
  private static instance: DatabaseService;
  private static readonly adminIdPromise = requireConfig('EXPO_PUBLIC_ADMIN_USERNAME');

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Product methods
  async getProducts(): Promise<Product[]> {
    const tenant = await getTenant();
    const result = await executeSql('SELECT * FROM products WHERE tenant_id=? ORDER BY created_at DESC', [tenant]);
    const rows = (result.rows as any)._array || [];
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      name_en: r.name_en,
      name_he: r.name_he,
      price: r.price,
      originalPrice: r.originalPrice ?? undefined,
      description: r.description,
      description_en: r.description_en,
      description_he: r.description_he,
      category: r.category,
      subcategory: r.subcategory || undefined,
      images: r.images ? JSON.parse(r.images) : [],
      videos: r.videos ? JSON.parse(r.videos) : undefined,
      colors: r.colors ? JSON.parse(r.colors) : undefined,
      rating: r.rating,
      reviews: r.reviews,
      badges: r.badges ? JSON.parse(r.badges) : undefined,
      pricingTier: r.pricing_tier || undefined,
      mixGroupId: r.mix_group_id || undefined,
      stock: r.stock,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async getProduct(id: string): Promise<Product | null> {
    const tenant = await getTenant();
    const res = await executeSql('SELECT * FROM products WHERE id = ? AND tenant_id=? LIMIT 1', [id, tenant]);
    const item = (res.rows as any)._array?.[0];
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      name_en: item.name_en,
      name_he: item.name_he,
      price: item.price,
      originalPrice: item.originalPrice ?? undefined,
      description: item.description,
      description_en: item.description_en,
      description_he: item.description_he,
      category: item.category,
      subcategory: item.subcategory || undefined,
      images: item.images ? JSON.parse(item.images) : [],
      videos: item.videos ? JSON.parse(item.videos) : undefined,
      colors: item.colors ? JSON.parse(item.colors) : undefined,
      rating: item.rating,
      reviews: item.reviews,
      badges: item.badges ? JSON.parse(item.badges) : undefined,
      pricingTier: item.pricing_tier || undefined,
      mixGroupId: item.mix_group_id || undefined,
      stock: item.stock,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<string> {
    const dbProd: any = { ...product };
    dbProd.pricing_tier = (product as any).pricingTier;
    dbProd.mix_group_id = (product as any).mixGroupId;
    const id = `prod_${Date.now()}`;
    const tenant = await getTenant();
    await executeSql(
      `INSERT INTO products (
        id, tenant_id, name, name_en, name_he, price, description, description_en,
        description_he, category, subcategory, images, videos, colors,
        rating, reviews, badges, pricing_tier, mix_group_id, stock,
        created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        tenant,
        dbProd.name,
        dbProd.name_en,
        dbProd.name_he,
        dbProd.price,
        dbProd.description,
        dbProd.description_en,
        dbProd.description_he,
        dbProd.category,
        dbProd.subcategory ?? null,
        JSON.stringify(dbProd.images || []),
        JSON.stringify(dbProd.videos || []),
        JSON.stringify(dbProd.colors || []),
        dbProd.rating ?? 0,
        dbProd.reviews ?? 0,
        JSON.stringify(dbProd.badges || []),
        dbProd.pricing_tier ?? null,
        dbProd.mix_group_id ?? null,
        dbProd.stock ?? 0,
        Date.now(),
        Date.now(),
      ],
    );
    try {
      const prod = await this.getProduct(id);
      if (prod) {
        await sendWakuProductUpdate(prod);
      }
    } catch (e) {
      console.error('Failed to send Waku product update:', e);
    }
    return id;
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    const dbProd: any = { ...product };
    dbProd.pricing_tier = (product as any).pricingTier;
    dbProd.mix_group_id = (product as any).mixGroupId;
    const tenant = await getTenant();
    await executeSql(
      `UPDATE products SET
        name=?, name_en=?, name_he=?, price=?, description=?,
        description_en=?, description_he=?, category=?, subcategory=?,
        images=?, videos=?, colors=?, rating=?, reviews=?, badges=?,
        pricing_tier=?, mix_group_id=?, stock=?, updated_at=?
      WHERE id=? AND tenant_id=?`,
      [
        dbProd.name,
        dbProd.name_en,
        dbProd.name_he,
        dbProd.price,
        dbProd.description,
        dbProd.description_en,
        dbProd.description_he,
        dbProd.category,
        dbProd.subcategory ?? null,
        JSON.stringify(dbProd.images || []),
        JSON.stringify(dbProd.videos || []),
        JSON.stringify(dbProd.colors || []),
        dbProd.rating ?? 0,
        dbProd.reviews ?? 0,
        JSON.stringify(dbProd.badges || []),
        dbProd.pricing_tier ?? null,
        dbProd.mix_group_id ?? null,
        dbProd.stock ?? 0,
        Date.now(),
        id,
        tenant,
      ],
    );
    try {
      const prod = await this.getProduct(id);
      if (prod) {
        await sendWakuProductUpdate(prod);
      }
    } catch (e) {
      console.error('Failed to send Waku product update:', e);
    }
  }

  async deleteProduct(id: string): Promise<void> {
    const tenant = await getTenant();
    await executeSql('DELETE FROM products WHERE id = ? AND tenant_id=?', [id, tenant]);
  }

  // Categories and subcategories
  async getCategories(): Promise<Category[]> {
    const catsRes = await executeSql('SELECT * FROM categories ORDER BY name');
    const subRes = await executeSql('SELECT * FROM subcategories ORDER BY name');
    const cats = (catsRes.rows as any)._array || [];
    const subs = (subRes.rows as any)._array || [];
    return cats.map((c: any) => ({
      id: c.id,
      name: c.name,
      name_en: c.name_en,
      name_he: c.name_he,
      icon: c.icon,
      subcategories: subs
        .filter((s: any) => s.category_id === c.id)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          name_en: s.name_en,
          name_he: s.name_he,
          icon: s.icon,
          categoryId: s.category_id,
          createdAt: s.created_at,
        })),
      createdAt: c.created_at,
    }));
  }

  async addCategory(category: Omit<Category, 'subcategories'>): Promise<void> {
    await executeSql(
      'INSERT INTO categories (id,name,name_en,name_he,icon) VALUES (?,?,?,?,?)',
      [category.id, category.name, category.name_en, category.name_he, category.icon],
    );
  }

  async updateCategory(id: string, category: Partial<Category>): Promise<void> {
    await executeSql(
      `UPDATE categories SET name=?, name_en=?, name_he=?, icon=? WHERE id=?`,
      [category.name, category.name_en, category.name_he, category.icon, id],
    );
  }

  async deleteCategory(id: string): Promise<void> {
    await executeSql('DELETE FROM categories WHERE id=?', [id]);
  }

  async addSubcategory(sub: Subcategory): Promise<void> {
    await executeSql(
      'INSERT INTO subcategories (id,name,name_en,name_he,icon,category_id) VALUES (?,?,?,?,?,?)',
      [sub.id, sub.name, sub.name_en, sub.name_he, sub.icon, sub.categoryId],
    );
  }

  async updateSubcategory(id: string, sub: Partial<Subcategory>): Promise<void> {
    await executeSql(
      `UPDATE subcategories SET name=?, name_en=?, name_he=?, icon=?, category_id=? WHERE id=?`,
      [sub.name, sub.name_en, sub.name_he, sub.icon, sub.categoryId, id],
    );
  }

  async deleteSubcategory(id: string): Promise<void> {
    await executeSql('UPDATE products SET subcategory=NULL WHERE subcategory=?', [id]);
    await executeSql('DELETE FROM subcategories WHERE id=?', [id]);
  }

  // Chat
  async getChatRooms(): Promise<ChatRoom[]> {
    const res = await executeSql('SELECT * FROM chat_rooms ORDER BY last_message_time DESC');
    const rows = (res.rows as any)._array || [];
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      lastMessage: r.last_message,
      lastMessageTime: r.last_message_time,
      unreadCount: r.unread_count || 0,
    }));
  }

  async getChatMessages(roomId: string): Promise<ChatMessage[]> {
    const res = await executeSql('SELECT * FROM chat_messages WHERE room_id=? ORDER BY timestamp ASC', [roomId]);
    const rows = (res.rows as any)._array || [];
    return rows.map((m: any) => ({
      id: m.id,
      roomId: m.room_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      message: m.message,
      timestamp: m.timestamp,
      isAdmin: !!m.is_admin,
      audioUri: m.audio_uri || undefined,
      audioDuration: m.audio_duration || undefined,
      reactions: m.reactions ? JSON.parse(m.reactions) : {},
    }));
  }

  async sendChatMessage(roomId: string, message: ChatMessage): Promise<void> {
    await executeSql(
      `INSERT INTO chat_messages (
        id, room_id, sender_id, sender_name, message, timestamp, is_admin,
        audio_uri, audio_duration, reactions
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        message.id,
        roomId,
        message.senderId,
        message.senderName,
        message.message,
        message.timestamp,
        message.isAdmin ? 1 : 0,
        message.audioUri ?? null,
        message.audioDuration ?? null,
        JSON.stringify(message.reactions || {}),
      ],
    );
    const countRes = await executeSql('SELECT unread_count FROM chat_rooms WHERE id=?', [roomId]);
    const current = (countRes.rows as any)._array?.[0]?.unread_count || 0;
    await executeSql(
      'UPDATE chat_rooms SET last_message=?, last_message_time=?, unread_count=? WHERE id=?',
      [message.message || '🎵 Voice message', message.timestamp, current + 1, roomId],
    );
  }

  async markChatRoomRead(roomId: string): Promise<void> {
    await executeSql('UPDATE chat_rooms SET unread_count=0 WHERE id=?', [roomId]);
  }

  async getOrCreateChatRoom(userId: string, userName: string): Promise<string> {
    const adminId = await DatabaseService.adminIdPromise;
    const id = 'room_' + [userId, adminId || 'admin'].sort().join('_');

    // Check for existing room with the new deterministic id
    let res = await executeSql(
      'SELECT id FROM chat_rooms WHERE id=? LIMIT 1',
      [id],
    );
    let existing = (res.rows as any)._array?.[0];
    if (existing) return existing.id;

    // Fallback: if a room exists with the old ID scheme (looked up by user_id),
    // migrate it to the new deterministic id
    res = await executeSql(
      'SELECT id FROM chat_rooms WHERE user_id=? LIMIT 1',
      [userId],
    );
    existing = (res.rows as any)._array?.[0];
    if (existing) {
      await executeSql('UPDATE chat_rooms SET id=? WHERE id=?', [id, existing.id]);
      await executeSql('UPDATE chat_messages SET room_id=? WHERE room_id=?', [id, existing.id]);
      return id;
    }

    // No existing room, create a new one
    await executeSql(
      'INSERT INTO chat_rooms (id,user_id,user_name,last_message,last_message_time,unread_count) VALUES (?,?,?,?,?,0)',
      [id, userId, userName, '', Date.now()],
    );
    return id;
  }

  async updateMessageReactions(messageId: string, reactions: Record<string, string[]>): Promise<void> {
    await executeSql('UPDATE chat_messages SET reactions=? WHERE id=?', [JSON.stringify(reactions), messageId]);
  }

  // Users
  async getUserProfile(userId: string): Promise<User | null> {
    const tenant = await getTenant();
    const res = await executeSql('SELECT * FROM user_profiles WHERE matrix_user_id=? AND tenant_id=? LIMIT 1', [userId, tenant]);
    const row = (res.rows as any)._array?.[0];
    if (!row) return null;
    return {
      id: row.id,
      username: row.app_username,
      displayName: row.display_name,
      email: row.email,
      isAdmin: row.role === 'admin',
      isDriver: row.role === 'driver',
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      kycStatus: row.kyc_status,
      customerTier: row.customer_tier,
      kycRequestNotes: row.kyc_request_notes,
      kycRequestedAt: row.kyc_requested_at,
      kycApprovedBy: row.kyc_approved_by,
      kycApprovedAt: row.kyc_approved_at,
    };
  }

  async getAllUserProfiles(): Promise<User[]> {
    const tenant = await getTenant();
    const res = await executeSql('SELECT * FROM user_profiles WHERE tenant_id=? ORDER BY created_at DESC', [tenant]);
    const rows = (res.rows as any)._array || [];
    return rows.map((row: any) => ({
      id: row.id,
      username: row.app_username,
      displayName: row.display_name,
      email: row.email,
      isAdmin: row.role === 'admin',
      isDriver: row.role === 'driver',
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      kycStatus: row.kyc_status,
      customerTier: row.customer_tier,
      kycRequestNotes: row.kyc_request_notes,
      kycRequestedAt: row.kyc_requested_at,
      kycApprovedBy: row.kyc_approved_by,
      kycApprovedAt: row.kyc_approved_at,
    }));
  }

  async findUserProfileByMatrixId(matrixId: string): Promise<User | null> {
    return this.getUserProfile(matrixId);
  }

  async searchUserProfiles(term: string): Promise<{ matrix_user_id: string; display_name: string; app_username: string }[]> {
    const like = `%${term}%`;
    const tenant = await getTenant();
    const res = await executeSql(
      `SELECT matrix_user_id, display_name, app_username FROM user_profiles WHERE tenant_id=? AND (display_name LIKE ? OR app_username LIKE ?) LIMIT 10`,
      [tenant, like, like],
    );
    return (res.rows as any)._array || [];
  }

  async updateUserRole(userId: string, role: 'user' | 'driver' | 'admin'): Promise<void> {
    const tenant = await getTenant();
    await executeSql('UPDATE user_profiles SET role=? WHERE id=? AND tenant_id=?', [role, userId, tenant]);
    try {
      const user = await this.getUserProfile(userId);
      if (user) {
        await sendWakuUserUpdate(user);
      }
    } catch (e) {
      console.error('Failed to send Waku user update:', e);
    }
  }

  async updateUserCustomerTier(userId: string, customerTier: string): Promise<void> {
    const tenant = await getTenant();
    await executeSql('UPDATE user_profiles SET customer_tier=? WHERE id=? AND tenant_id=?', [customerTier, userId, tenant]);
    try {
      const user = await this.getUserProfile(userId);
      if (user) {
        await sendWakuUserUpdate(user);
      }
    } catch (e) {
      console.error('Failed to send Waku user update:', e);
    }
  }

  async updateUserKycStatus(
    userId: string,
    status: 'none' | 'pending' | 'verified' | 'rejected',
    approvedBy?: string,
    requestNotes?: string,
  ): Promise<boolean> {
    const updateData: any = { kyc_status: status };
    if (status === 'pending') {
      updateData.kyc_requested_at = new Date().toISOString();
      if (requestNotes) updateData.kyc_request_notes = requestNotes;
    } else if (status === 'verified' || status === 'rejected') {
      updateData.kyc_approved_at = new Date().toISOString();
      if (approvedBy) updateData.kyc_approved_by = approvedBy;
    }
    const fields = Object.keys(updateData)
      .map((k) => `${k}=?`)
      .join(', ');
    const tenant = await getTenant();
    const params = [...Object.values(updateData), userId, tenant];
    await executeSql(`UPDATE user_profiles SET ${fields} WHERE id=? AND tenant_id=?`, params);
    try {
      const user = await this.getUserProfile(userId);
      if (user) {
        await sendWakuUserUpdate(user);
      }
    } catch (e) {
      console.error('Failed to send Waku user update:', e);
    }
    return true;
  }

  async getPendingKycRequests(): Promise<User[]> {
    const tenant = await getTenant();
    const res = await executeSql("SELECT * FROM user_profiles WHERE kyc_status='pending' AND tenant_id=? ORDER BY kyc_requested_at ASC", [tenant]);
    const rows = (res.rows as any)._array || [];
    return rows.map((row: any) => ({
      id: row.matrix_user_id,
      username: row.app_username,
      displayName: row.display_name,
      email: row.email,
      isAdmin: row.role === 'admin',
      isDriver: row.role === 'driver',
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      kycStatus: row.kyc_status,
      customerTier: row.customer_tier,
      kycRequestNotes: row.kyc_request_notes,
      kycRequestedAt: row.kyc_requested_at,
      kycApprovedBy: row.kyc_approved_by,
      kycApprovedAt: row.kyc_approved_at,
    }));
  }

  // Reviews
  async getReviews(): Promise<Review[]> {
    const res = await executeSql('SELECT * FROM reviews ORDER BY date DESC');
    return (res.rows as any)._array || [];
  }

  async getProductReviews(productId: string): Promise<Review[]> {
    const res = await executeSql('SELECT * FROM reviews WHERE product_id=? ORDER BY date DESC', [productId]);
    return (res.rows as any)._array || [];
  }

  async addReview(review: Review): Promise<void> {
    await executeSql(
      `INSERT INTO reviews (
        id, product_id, product_name, product_image, user_id, user_name,
        user_avatar, rating, title, comment, date, helpful, verified, order_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        review.id,
        review.productId,
        review.productName,
        review.productImage,
        review.userId,
        review.userName,
        review.userAvatar,
        review.rating,
        review.title,
        review.comment ?? null,
        review.date,
        review.helpful,
        review.verified ? 1 : 0,
        review.orderId ?? null,
      ],
    );
  }

  async updateReview(id: string, review: Partial<Review>): Promise<void> {
    const fields = Object.keys(review)
      .map((k) => `${k}=?`)
      .join(', ');
    const params = [...Object.values(review), id];
    await executeSql(`UPDATE reviews SET ${fields} WHERE id=?`, params);
  }

  async deleteReview(id: string): Promise<void> {
    await executeSql('DELETE FROM reviews WHERE id=?', [id]);
  }

  // Hero banners
  async getHeroBanners(): Promise<HeroBanner[]> {
    const res = await executeSql('SELECT * FROM hero_banners WHERE is_active=1 ORDER BY "order" ASC');
    const rows = (res.rows as any)._array || [];
    return rows.map((b: any) => ({
      id: b.id,
      title: b.title,
      title_en: b.title_en,
      title_he: b.title_he,
      subtitle: b.subtitle,
      subtitle_en: b.subtitle_en,
      subtitle_he: b.subtitle_he,
      image: b.image,
      discount: b.discount,
      discount_en: b.discount_en,
      discount_he: b.discount_he,
      category: b.category,
      isActive: !!b.is_active,
      order: b.order,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
  }

  async addHeroBanner(banner: Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `banner_${Date.now()}`;
    await executeSql(
      `INSERT INTO hero_banners (
        id,title,subtitle,image,discount,category,is_active, "order",
        title_en,title_he,subtitle_en,subtitle_he,discount_en,discount_he
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        banner.title,
        banner.subtitle,
        banner.image,
        banner.discount ?? '',
        banner.category,
        banner.isActive ? 1 : 0,
        banner.order,
        banner.title_en ?? null,
        banner.title_he ?? null,
        banner.subtitle_en ?? null,
        banner.subtitle_he ?? null,
        banner.discount_en ?? null,
        banner.discount_he ?? null,
      ],
    );
    return id;
  }

  async updateHeroBanner(id: string, banner: Partial<HeroBanner>): Promise<void> {
    const fields = Object.keys(banner)
      .map((k) => `${k === 'isActive' ? 'is_active' : k}=?`)
      .join(', ');
    const values = Object.entries(banner).map(([k, v]) => (k === 'isActive' ? (v ? 1 : 0) : v));
    await executeSql(`UPDATE hero_banners SET ${fields} WHERE id=?`, [...values, id]);
  }

  async deleteHeroBanner(id: string): Promise<void> {
    await executeSql('DELETE FROM hero_banners WHERE id=?', [id]);
  }

  // Pricing tiers
  async getPricingTiers(): Promise<PricingTier[]> {
    const tiersRes = await executeSql('SELECT * FROM pricing_tiers');
    const rulesRes = await executeSql('SELECT * FROM price_tier_rules');
    const tiers = (tiersRes.rows as any)._array || [];
    const rules = (rulesRes.rows as any)._array || [];
    return tiers.map((t: any) => ({
      id: t.id,
      name: t.name,
      name_en: t.name_en,
      name_he: t.name_he,
      pricePerUnit: t.price_per_unit,
      minQuantity: t.min_quantity,
      description: t.description,
      description_en: t.description_en,
      description_he: t.description_he,
      createdAt: t.created_at,
      rules: rules
        .filter((r: any) => r.tier_id === t.id)
        .sort((a: any, b: any) => a.min_qty - b.min_qty)
        .map((r: any) => ({
          id: r.id,
          tierId: r.tier_id,
          minQty: r.min_qty,
          maxQty: r.max_qty,
          pricePerBaseUnit: r.price_per_unit,
          discountPct: r.discount_pct,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
    }));
  }

  async getPricingTier(id: string): Promise<PricingTier | null> {
    const tierRes = await executeSql('SELECT * FROM pricing_tiers WHERE id=? LIMIT 1', [id]);
    const tier = (tierRes.rows as any)._array?.[0];
    if (!tier) return null;
    const rulesRes = await executeSql('SELECT * FROM price_tier_rules WHERE tier_id=? ORDER BY min_qty ASC', [id]);
    const rules = (rulesRes.rows as any)._array || [];
    return {
      id: tier.id,
      name: tier.name,
      name_en: tier.name_en,
      name_he: tier.name_he,
      pricePerUnit: tier.price_per_unit,
      minQuantity: tier.min_quantity,
      description: tier.description,
      description_en: tier.description_en,
      description_he: tier.description_he,
      createdAt: tier.created_at,
      rules: rules.map((r: any) => ({
        id: r.id,
        tierId: r.tier_id,
        minQty: r.min_qty,
        maxQty: r.max_qty,
        pricePerBaseUnit: r.price_per_unit,
        discountPct: r.discount_pct,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
  }

  async addPricingTier(tier: PricingTier): Promise<void> {
    await executeSql(
      `INSERT INTO pricing_tiers (
        id,name,name_en,name_he,price_per_unit,min_quantity,description,
        description_en,description_he
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        tier.id,
        tier.name,
        tier.name_en ?? null,
        tier.name_he ?? null,
        tier.pricePerUnit ?? null,
        tier.minQuantity,
        tier.description,
        tier.description_en ?? null,
        tier.description_he ?? null,
      ],
    );
    if (tier.rules && tier.rules.length > 0) {
      for (const r of tier.rules) {
        await executeSql(
          `INSERT INTO price_tier_rules (id,tier_id,min_qty,max_qty,price_per_unit,discount_pct) VALUES (?,?,?,?,?,?)`,
          [
            r.id,
            tier.id,
            r.minQty,
            r.maxQty,
            r.pricePerBaseUnit ?? null,
            r.discountPct ?? null,
          ],
        );
      }
    }
  }

  async updatePricingTier(id: string, tier: Partial<PricingTier>): Promise<void> {
    const fields = [
      'name',
      'name_en',
      'name_he',
      'price_per_unit',
      'min_quantity',
      'description',
      'description_en',
      'description_he',
    ];
    const updates: any[] = [];
    const params: any[] = [];
    for (const f of fields) {
      const key = f === 'price_per_unit' ? 'pricePerUnit' : f.replace(/_(en|he)/, '_$1');
      const value = (tier as any)[key];
      if (value !== undefined) {
        updates.push(`${f}=?`);
        params.push(value);
      }
    }
    if (updates.length) {
      await executeSql(`UPDATE pricing_tiers SET ${updates.join(', ')} WHERE id=?`, [...params, id]);
    }
    if (tier.rules) {
      await executeSql('DELETE FROM price_tier_rules WHERE tier_id=?', [id]);
      for (const r of tier.rules) {
        await executeSql(
          `INSERT INTO price_tier_rules (id,tier_id,min_qty,max_qty,price_per_unit,discount_pct) VALUES (?,?,?,?,?,?)`,
          [
            r.id,
            id,
            r.minQty,
            r.maxQty,
            r.pricePerBaseUnit ?? null,
            r.discountPct ?? null,
          ],
        );
      }
    }
  }

  async deletePricingTier(id: string): Promise<void> {
    await executeSql("UPDATE products SET pricing_tier='standard' WHERE pricing_tier=?", [id]);
    await executeSql('DELETE FROM pricing_tiers WHERE id=?', [id]);
    await executeSql('DELETE FROM price_tier_rules WHERE tier_id=?', [id]);
  }

  // Mix groups
  async getMixGroups(): Promise<MixGroup[]> {
    const res = await executeSql('SELECT * FROM mix_groups');
    const rows = (res.rows as any)._array || [];
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      conversionFactor: r.conversion_factor,
      createdAt: r.created_at,
    }));
  }

  async getMixGroup(id: string): Promise<MixGroup | null> {
    const res = await executeSql('SELECT * FROM mix_groups WHERE id=? LIMIT 1', [id]);
    const row = (res.rows as any)._array?.[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      conversionFactor: row.conversion_factor,
      createdAt: row.created_at,
    };
  }

  async addMixGroup(group: MixGroup): Promise<void> {
    await executeSql('INSERT INTO mix_groups (id,name,conversion_factor) VALUES (?,?,?)', [group.id, group.name, group.conversionFactor]);
  }

  async updateMixGroup(id: string, group: Partial<MixGroup>): Promise<void> {
    await executeSql('UPDATE mix_groups SET name=?, conversion_factor=? WHERE id=?', [group.name, group.conversionFactor, id]);
  }

  async deleteMixGroup(id: string): Promise<void> {
    await executeSql('UPDATE products SET mix_group_id=NULL WHERE mix_group_id=?', [id]);
    await executeSql('DELETE FROM mix_groups WHERE id=?', [id]);
  }

  // Wishlist
  async getWishlistItems(userId: string): Promise<WishlistItem[]> {
    const res = await executeSql('SELECT * FROM wishlist_items WHERE user_id=? ORDER BY added_at DESC', [userId]);
    const rows = (res.rows as any)._array || [];
    const items: WishlistItem[] = [];
    for (const row of rows) {
      const product = await this.getProduct(row.product_id);
      if (product) {
        items.push({
          id: row.id,
          productId: row.product_id,
          product,
          addedAt: row.added_at,
        });
      }
    }
    return items;
  }

  async addWishlistItem(userId: string, productId: string): Promise<void> {
    await executeSql('INSERT INTO wishlist_items (id,user_id,product_id,added_at) VALUES (?,?,?,?)', [
      `wish_${Date.now()}`,
      userId,
      productId,
      Date.now(),
    ]);
  }

  async removeWishlistItem(userId: string, productId: string): Promise<void> {
    await executeSql('DELETE FROM wishlist_items WHERE user_id=? AND product_id=?', [userId, productId]);
  }

  async getUserOrders(userId: string): Promise<{ id: string; total: number; status: string; createdAt: string }[]> {
    const tenant = await getTenant();
    const res = await executeSql('SELECT id,total,status,created_at FROM orders WHERE user_id=? AND tenant_id=? ORDER BY created_at DESC', [userId, tenant]);
    const rows = (res.rows as any)._array || [];
    return rows.map((o: any) => ({ id: o.id, total: Number(o.total), status: o.status, createdAt: o.created_at }));
  }

  // Delivery jobs
  async getDeliveryJobsForDriver(driverId: string): Promise<DeliveryJob[]> {
    const res = await executeSql('SELECT * FROM delivery_jobs WHERE driver_id=? ORDER BY created_at DESC', [driverId]);
    const rows = (res.rows as any)._array || [];
    return rows.map((j: any) => ({
      id: j.id,
      orderId: j.order_id,
      driverId: j.driver_id,
      status: j.status,
      pickupTime: j.pickup_time || undefined,
      dropoffTime: j.dropoff_time || undefined,
      proofUri: j.proof_uri || undefined,
      createdAt: j.created_at,
      updatedAt: j.updated_at,
    }));
  }

  async getAllDeliveryJobs(): Promise<DeliveryJob[]> {
    const res = await executeSql('SELECT * FROM delivery_jobs ORDER BY created_at DESC');
    const rows = (res.rows as any)._array || [];
    return rows.map((j: any) => ({
      id: j.id,
      orderId: j.order_id,
      driverId: j.driver_id,
      status: j.status,
      pickupTime: j.pickup_time || undefined,
      dropoffTime: j.dropoff_time || undefined,
      proofUri: j.proof_uri || undefined,
      createdAt: j.created_at,
      updatedAt: j.updated_at,
    }));
  }

  async createDeliveryJob(orderId: string, driverId: string): Promise<void> {
    await executeSql('INSERT INTO delivery_jobs (id,order_id,driver_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?)', [
      `job_${Date.now()}`,
      orderId,
      driverId,
      'pending',
      Date.now(),
      Date.now(),
    ]);
  }

  async updateDeliveryJobStatus(jobId: string, status: DeliveryJobStatus): Promise<void> {
    await executeSql('UPDATE delivery_jobs SET status=? WHERE id=?', [status, jobId]);
  }

  async updateDeliveryJobProof(jobId: string, proofUri: string): Promise<void> {
    await executeSql('UPDATE delivery_jobs SET proof_uri=? WHERE id=?', [proofUri, jobId]);
  }

  // Settings
  async getSetting(key: string): Promise<string | null> {
    const res = await executeSql('SELECT value FROM settings WHERE key=? LIMIT 1', [key]);
    return (res.rows as any)._array?.[0]?.value ?? null;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    const existsRes = await executeSql('SELECT key FROM settings WHERE key=?', [key]);
    const exists = (existsRes.rows as any)._array?.length > 0;
    if (exists) {
      await executeSql('UPDATE settings SET value=? WHERE key=?', [value, key]);
    } else {
      await executeSql(
        'INSERT INTO settings (key,value,type,description) VALUES (?,?,\'string\',?)',
        [key, value, `Setting for ${key}`],
      );
    }
    const rowRes = await executeSql(
      'SELECT created_at, updated_at FROM settings WHERE key=?',
      [key],
    );
    const row = (rowRes.rows as any)._array?.[0];
    const createdAt = row?.created_at ?? Date.now();
    const updatedAt = row?.updated_at ?? Date.now();
    try {
      await sendWakuSettingsUpdate(key, value, createdAt, updatedAt);
      } catch (e) {
      console.error('Failed to send Waku settings update:', e);
    }
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const res = await executeSql('SELECT key,value FROM settings');
    const rows = (res.rows as any)._array || [];
    const obj: Record<string, string> = {};
    rows.forEach((r: any) => {
      obj[r.key] = r.value;
    });
    return obj;
  }

  async getTenantSetting(tenant: string, key: string): Promise<string | null> {
    const res = await executeSql(`SELECT ${key} FROM tenant_settings WHERE tenant_id=? LIMIT 1`, [tenant]);
    const row = (res.rows as any)._array?.[0];
    return row ? row[key] || null : null;
  }

  async updateTenantSetting(tenant: string, key: string, value: string): Promise<void> {
    const res = await executeSql('SELECT tenant_id FROM tenant_settings WHERE tenant_id=?', [tenant]);
    const exists = (res.rows as any)._array?.length > 0;
    if (exists) {
      await executeSql(`UPDATE tenant_settings SET ${key}=? WHERE tenant_id=?`, [value, tenant]);
    } else {
      await executeSql(`INSERT INTO tenant_settings (tenant_id, ${key}) VALUES (?, ?)`, [tenant, value]);
    }
    const rowRes = await executeSql(
      'SELECT created_at, updated_at FROM tenant_settings WHERE tenant_id=?',
      [tenant],
    );
    const row = (rowRes.rows as any)._array?.[0];
    const createdAt = row?.created_at ?? Date.now();
    const updatedAt = row?.updated_at ?? Date.now();
    try {
      await sendWakuSettingsUpdate(key, value, createdAt, updatedAt);
    } catch (e) {
      console.error('Failed to send Waku settings update:', e);
    }
  }
}

export default DatabaseService;
