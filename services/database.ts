import { supabase } from './supabase';
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
  MixGroup
} from '../types';

class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProducts:', error);
      return [];
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getProduct:', error);
      return null;
    }
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) {
        console.error('Error adding product:', error);
        throw new Error('Failed to add product');
      }

      return data.id;
    } catch (error) {
      console.error('Error in addProduct:', error);
      throw error;
    }
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id);

      if (error) {
        console.error('Error updating product:', error);
        throw new Error('Failed to update product');
      }
    } catch (error) {
      console.error('Error in updateProduct:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting product:', error);
        throw new Error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      throw error;
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      // First get all categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        return [];
      }

      // Then get all subcategories
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (subcategoriesError) {
        console.error('Error fetching subcategories:', subcategoriesError);
        return categoriesData || [];
      }

      // Map subcategories to their parent categories
      const categories = categoriesData.map(category => {
        const subcategories = subcategoriesData.filter(
          subcategory => subcategory.category_id === category.id
        ).map(subcategory => ({
          id: subcategory.id,
          name: subcategory.name,
          name_en: subcategory.name_en,
          name_he: subcategory.name_he,
          icon: subcategory.icon,
          categoryId: subcategory.category_id,
          createdAt: subcategory.created_at
        }));

        return {
          id: category.id,
          name: category.name,
          name_en: category.name_en,
          name_he: category.name_he,
          icon: category.icon,
          subcategories,
          createdAt: category.created_at
        };
      });

      return categories;
    } catch (error) {
      console.error('Error in getCategories:', error);
      return [];
    }
  }

  async addCategory(category: Omit<Category, 'subcategories'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{
          id: category.id,
          name: category.name,
          name_en: category.name_en,
          name_he: category.name_he,
          icon: category.icon
        }]);

      if (error) {
        console.error('Error adding category:', error);
        throw new Error('Failed to add category');
      }
    } catch (error) {
      console.error('Error in addCategory:', error);
      throw error;
    }
  }

  async updateCategory(id: string, category: Partial<Category>): Promise<void> {
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: category.name,
          name_en: category.name_en,
          name_he: category.name_he,
          icon: category.icon
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating category:', error);
        throw new Error('Failed to update category');
      }
    } catch (error) {
      console.error('Error in updateCategory:', error);
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting category:', error);
        throw new Error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      throw error;
    }
  }

  // Subcategories
  async addSubcategory(subcategory: Omit<Subcategory, 'id'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('subcategories')
        .insert([{
          id: subcategory.id,
          name: subcategory.name,
          name_en: subcategory.name_en,
          name_he: subcategory.name_he,
          icon: subcategory.icon,
          category_id: subcategory.categoryId
        }]);

      if (error) {
        console.error('Error adding subcategory:', error);
        throw new Error('Failed to add subcategory');
      }
    } catch (error) {
      console.error('Error in addSubcategory:', error);
      throw error;
    }
  }

  async updateSubcategory(id: string, subcategory: Partial<Subcategory>): Promise<void> {
    try {
      const { error } = await supabase
        .from('subcategories')
        .update({
          name: subcategory.name,
          name_en: subcategory.name_en,
          name_he: subcategory.name_he,
          icon: subcategory.icon,
          category_id: subcategory.categoryId
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating subcategory:', error);
        throw new Error('Failed to update subcategory');
      }
    } catch (error) {
      console.error('Error in updateSubcategory:', error);
      throw error;
    }
  }

  async deleteSubcategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting subcategory:', error);
        throw new Error('Failed to delete subcategory');
      }
    } catch (error) {
      console.error('Error in deleteSubcategory:', error);
      throw error;
    }
  }

  // Chat Rooms
  async getChatRooms(): Promise<ChatRoom[]> {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('last_message_time', { ascending: false });

      if (error) {
        console.error('Error fetching chat rooms:', error);
        return [];
      }

      return (data || []).map(room => ({
        id: room.id,
        userId: room.user_id,
        userName: room.user_name,
        lastMessage: room.last_message,
        lastMessageTime: room.last_message_time,
        unreadCount: room.unread_count || 0
      }));
    } catch (error) {
      console.error('Error in getChatRooms:', error);
      return [];
    }
  }

  async getChatMessages(roomId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching chat messages:', error);
        return [];
      }

      return (data || []).map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        message: msg.message,
        timestamp: msg.timestamp,
        isAdmin: msg.is_admin,
        audioUri: msg.audio_uri,
        audioDuration: msg.audio_duration,
        reactions: msg.reactions || {}
      }));
    } catch (error) {
      console.error('Error in getChatMessages:', error);
      return [];
    }
  }

  async sendChatMessage(roomId: string, message: ChatMessage): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          id: message.id,
          room_id: roomId,
          sender_id: message.senderId,
          sender_name: message.senderName,
          message: message.message,
          timestamp: message.timestamp,
          is_admin: message.isAdmin,
          audio_uri: message.audioUri,
          audio_duration: message.audioDuration,
          reactions: message.reactions || {}
        }]);

      if (error) {
        console.error('Error sending chat message:', error);
        throw new Error('Failed to send message');
      }

      // Update the chat room's last message
      await supabase
        .from('chat_rooms')
        .update({
          last_message: message.message || '🎵 Voice message',
          last_message_time: message.timestamp,
          unread_count: supabase.sql`unread_count + 1`
        })
        .eq('id', roomId);
    } catch (error) {
      console.error('Error in sendChatMessage:', error);
      throw error;
    }
  }

  // User Profiles
  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('matrix_user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        username: data.app_username,
        displayName: data.display_name,
        email: data.email,
        isAdmin: data.role === 'admin',
        role: data.role,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        kycStatus: data.kyc_status,
        customerTier: data.customer_tier,
        kycRequestNotes: data.kyc_request_notes,
        kycRequestedAt: data.kyc_requested_at,
        kycApprovedBy: data.kyc_approved_by,
        kycApprovedAt: data.kyc_approved_at
      };
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  }

  async getAllUserProfiles(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user profiles:', error);
        return [];
      }

      return (data || []).map(profile => ({
        id: profile.id,
        username: profile.app_username,
        displayName: profile.display_name,
        email: profile.email,
        isAdmin: profile.role === 'admin',
        role: profile.role,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        kycStatus: profile.kyc_status,
        customerTier: profile.customer_tier,
        kycRequestNotes: profile.kyc_request_notes,
        kycRequestedAt: profile.kyc_requested_at,
        kycApprovedBy: profile.kyc_approved_by,
        kycApprovedAt: profile.kyc_approved_at
      }));
    } catch (error) {
      console.error('Error in getAllUserProfiles:', error);
      return [];
    }
  }

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        throw new Error('Failed to update user role');
      }
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      throw error;
    }
  }

  async updateUserCustomerTier(userId: string, customerTier: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ customer_tier: customerTier })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user customer tier:', error);
        throw new Error('Failed to update user customer tier');
      }
    } catch (error) {
      console.error('Error in updateUserCustomerTier:', error);
      throw error;
    }
  }

  async updateUserKycStatus(
    userId: string, 
    status: 'none' | 'pending' | 'verified' | 'rejected',
    approvedBy?: string,
    requestNotes?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { 
        kyc_status: status 
      };
      
      if (status === 'pending') {
        updateData.kyc_requested_at = new Date().toISOString();
        if (requestNotes) {
          updateData.kyc_request_notes = requestNotes;
        }
      } else if (status === 'verified' || status === 'rejected') {
        updateData.kyc_approved_at = new Date().toISOString();
        if (approvedBy) {
          updateData.kyc_approved_by = approvedBy;
        }
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('matrix_user_id', userId);

      if (error) {
        console.error('Error updating user KYC status:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateUserKycStatus:', error);
      return false;
    }
  }

  async getPendingKycRequests(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('kyc_status', 'pending')
        .order('kyc_requested_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending KYC requests:', error);
        return [];
      }

      return (data || []).map(profile => ({
        id: profile.matrix_user_id,
        username: profile.app_username,
        displayName: profile.display_name,
        email: profile.email,
        isAdmin: profile.role === 'admin',
        role: profile.role,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        kycStatus: profile.kyc_status,
        customerTier: profile.customer_tier,
        kycRequestNotes: profile.kyc_request_notes,
        kycRequestedAt: profile.kyc_requested_at,
        kycApprovedBy: profile.kyc_approved_by,
        kycApprovedAt: profile.kyc_approved_at
      }));
    } catch (error) {
      console.error('Error in getPendingKycRequests:', error);
      return [];
    }
  }

  // Reviews
  async getReviews(): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getReviews:', error);
      return [];
    }
  }

  async getProductReviews(productId: string): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching product reviews:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProductReviews:', error);
      return [];
    }
  }

  async addReview(review: Review): Promise<void> {
    try {
      const { error } = await supabase
        .from('reviews')
        .insert([review]);

      if (error) {
        console.error('Error adding review:', error);
        throw new Error('Failed to add review');
      }
    } catch (error) {
      console.error('Error in addReview:', error);
      throw error;
    }
  }

  async updateReview(id: string, review: Partial<Review>): Promise<void> {
    try {
      const { error } = await supabase
        .from('reviews')
        .update(review)
        .eq('id', id);

      if (error) {
        console.error('Error updating review:', error);
        throw new Error('Failed to update review');
      }
    } catch (error) {
      console.error('Error in updateReview:', error);
      throw error;
    }
  }

  async deleteReview(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting review:', error);
        throw new Error('Failed to delete review');
      }
    } catch (error) {
      console.error('Error in deleteReview:', error);
      throw error;
    }
  }

  // Hero Banners
  async getHeroBanners(): Promise<HeroBanner[]> {
    try {
      const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .eq('is_active', true)
        .order('order', { ascending: true });

      if (error) {
        console.error('Error fetching hero banners:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getHeroBanners:', error);
      return [];
    }
  }

  // Pricing Tiers
  async getPricingTiers(): Promise<PricingTier[]> {
    try {
      const { data: tiersData, error: tiersError } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('created_at', { ascending: true });

      if (tiersError) {
        console.error('Error fetching pricing tiers:', tiersError);
        return [];
      }

      const { data: rulesData, error: rulesError } = await supabase
        .from('price_tier_rules')
        .select('*');

      if (rulesError) {
        console.error('Error fetching pricing tier rules:', rulesError);
      }

      return (tiersData || []).map(tier => ({
        id: tier.id,
        name: tier.name,
        name_en: tier.name_en,
        name_he: tier.name_he,
        pricePerUnit: tier.price_per_unit, // Changed from discount to price_per_unit
        minQuantity: tier.min_quantity,
        description: tier.description,
        description_en: tier.description_en,
        description_he: tier.description_he,
        createdAt: tier.created_at,
        rules: (rulesData || [])
          .filter(r => r.tier_id === tier.id)
          .sort((a, b) => a.min_qty - b.min_qty)
          .map(r => ({
            id: r.id,
            tierId: r.tier_id,
            minQty: r.min_qty,
            maxQty: r.max_qty,
            pricePerBaseUnit: r.price_per_unit,
            discountPct: r.discount_pct,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          }))
      }));
    } catch (error) {
      console.error('Error in getPricingTiers:', error);
      return [];
    }
  }

  async getPricingTier(id: string): Promise<PricingTier | null> {
    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching pricing tier:', error);
        return null;
      }

      if (!data) return null;

      const { data: rulesData, error: rulesError } = await supabase
        .from('price_tier_rules')
        .select('*')
        .eq('tier_id', id)
        .order('min_qty', { ascending: true });

      if (rulesError) {
        console.error('Error fetching pricing tier rules:', rulesError);
      }

      return {
        id: data.id,
        name: data.name,
        name_en: data.name_en,
        name_he: data.name_he,
        pricePerUnit: data.price_per_unit, // Changed from discount to price_per_unit
        minQuantity: data.min_quantity,
        description: data.description,
        description_en: data.description_en,
        description_he: data.description_he,
        createdAt: data.created_at,
        rules: (rulesData || []).map(r => ({
          id: r.id,
          tierId: r.tier_id,
          minQty: r.min_qty,
          maxQty: r.max_qty,
          pricePerBaseUnit: r.price_per_unit,
          discountPct: r.discount_pct,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }))
      };
    } catch (error) {
      console.error('Error in getPricingTier:', error);
      return null;
    }
  }

  async addPricingTier(tier: PricingTier): Promise<void> {
    try {
      const { error } = await supabase
        .from('pricing_tiers')
        .insert([{
          id: tier.id,
          name: tier.name,
          name_en: tier.name_en,
          name_he: tier.name_he,
          price_per_unit: tier.pricePerUnit, // Changed from discount to price_per_unit
          min_quantity: tier.minQuantity,
          description: tier.description,
          description_en: tier.description_en,
          description_he: tier.description_he
        }]);

      if (error) {
        console.error('Error adding pricing tier:', error);
        throw new Error('Failed to add pricing tier');
      }

      if (tier.rules && tier.rules.length > 0) {
        const rulesToInsert = tier.rules.map(r => ({
          tier_id: tier.id,
          min_qty: r.minQty,
          max_qty: r.maxQty,
          price_per_unit: r.pricePerBaseUnit,
          discount_pct: r.discountPct
        }));
        const { error: ruleError } = await supabase
          .from('price_tier_rules')
          .insert(rulesToInsert);
        if (ruleError) {
          console.error('Error adding pricing tier rules:', ruleError);
          throw new Error('Failed to add pricing tier rules');
        }
      }
    } catch (error) {
      console.error('Error in addPricingTier:', error);
      throw error;
    }
  }

  async updatePricingTier(id: string, tier: Partial<PricingTier>): Promise<void> {
    try {
      const { error } = await supabase
        .from('pricing_tiers')
        .update({
          name: tier.name,
          name_en: tier.name_en,
          name_he: tier.name_he,
          price_per_unit: tier.pricePerUnit, // Changed from discount to price_per_unit
          min_quantity: tier.minQuantity,
          description: tier.description,
          description_en: tier.description_en,
          description_he: tier.description_he
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating pricing tier:', error);
        throw new Error('Failed to update pricing tier');
      }

      if (tier.rules) {
        await supabase
          .from('price_tier_rules')
          .delete()
          .eq('tier_id', id);

        if (tier.rules.length > 0) {
          const rulesToInsert = tier.rules.map(r => ({
            tier_id: id,
            min_qty: r.minQty,
            max_qty: r.maxQty,
            price_per_unit: r.pricePerBaseUnit,
            discount_pct: r.discountPct
          }));
          const { error: ruleError } = await supabase
            .from('price_tier_rules')
            .insert(rulesToInsert);
          if (ruleError) {
            console.error('Error updating pricing tier rules:', ruleError);
            throw new Error('Failed to update pricing tier rules');
          }
        }
      }
    } catch (error) {
      console.error('Error in updatePricingTier:', error);
      throw error;
    }
  }

  async deletePricingTier(id: string): Promise<void> {
    try {
      // First update any products using this tier to use the standard tier
      await supabase
        .from('products')
        .update({ pricing_tier: 'standard' })
        .eq('pricing_tier', id);
      
      // Then delete the tier
      const { error } = await supabase
        .from('pricing_tiers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting pricing tier:', error);
        throw new Error('Failed to delete pricing tier');
      }
    } catch (error) {
      console.error('Error in deletePricingTier:', error);
      throw error;
    }
  }

  // Mix Groups
  async getMixGroups(): Promise<MixGroup[]> {
    try {
      const { data, error } = await supabase
        .from('mix_groups')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching mix groups:', error);
        return [];
      }

      return (data || []).map(group => ({
        id: group.id,
        name: group.name,
        conversionFactor: group.conversion_factor,
        createdAt: group.created_at
      }));
    } catch (error) {
      console.error('Error in getMixGroups:', error);
      return [];
    }
  }

  async getMixGroup(id: string): Promise<MixGroup | null> {
    try {
      const { data, error } = await supabase
        .from('mix_groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching mix group:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        conversionFactor: data.conversion_factor,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error in getMixGroup:', error);
      return null;
    }
  }

  async addMixGroup(group: MixGroup): Promise<void> {
    try {
      const { error } = await supabase
        .from('mix_groups')
        .insert([{ id: group.id, name: group.name, conversion_factor: group.conversionFactor }]);

      if (error) {
        console.error('Error adding mix group:', error);
        throw new Error('Failed to add mix group');
      }
    } catch (error) {
      console.error('Error in addMixGroup:', error);
      throw error;
    }
  }

  async updateMixGroup(id: string, group: Partial<MixGroup>): Promise<void> {
    try {
      const { error } = await supabase
        .from('mix_groups')
        .update({
          name: group.name,
          conversion_factor: group.conversionFactor
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating mix group:', error);
        throw new Error('Failed to update mix group');
      }
    } catch (error) {
      console.error('Error in updateMixGroup:', error);
      throw error;
    }
  }

  async deleteMixGroup(id: string): Promise<void> {
    try {
      // Remove reference from products first
      await supabase
        .from('products')
        .update({ mix_group_id: null })
        .eq('mix_group_id', id);

      const { error } = await supabase
        .from('mix_groups')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting mix group:', error);
        throw new Error('Failed to delete mix group');
      }
    } catch (error) {
      console.error('Error in deleteMixGroup:', error);
      throw error;
    }
  }

  // Settings
  async getSetting(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        console.error(`Error fetching setting ${key}:`, error);
        return null;
      }

      return data?.value || null;
    } catch (error) {
      console.error(`Error in getSetting for ${key}:`, error);
      return null;
    }
  }

  async updateSetting(key: string, value: string): Promise<void> {
    try {
      // First check if the setting exists
      const { data } = await supabase
        .from('settings')
        .select('key')
        .eq('key', key)
        .single();

      if (data) {
        // Update existing setting
        const { error } = await supabase
          .from('settings')
          .update({ value })
          .eq('key', key);

        if (error) {
          console.error(`Error updating setting ${key}:`, error);
          throw new Error(`Failed to update setting ${key}`);
        }
      } else {
        // Insert new setting
        const { error } = await supabase
          .from('settings')
          .insert([{ 
            key, 
            value, 
            type: 'string',
            description: `Setting for ${key}`
          }]);

        if (error) {
          console.error(`Error inserting setting ${key}:`, error);
          throw new Error(`Failed to insert setting ${key}`);
        }
      }
    } catch (error) {
      console.error(`Error in updateSetting for ${key}:`, error);
      throw error;
    }
  }

  async getAllSettings(): Promise<Record<string, string>> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) {
        console.error('Error fetching all settings:', error);
        return {};
      }

      // Convert array of {key, value} to object
      return (data || []).reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {} as Record<string, string>);
    } catch (error) {
      console.error('Error in getAllSettings:', error);
      return {};
    }
  }
}

export default DatabaseService;