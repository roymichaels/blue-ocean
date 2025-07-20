import { executeSql } from '../lib/sqlite';
import { supabase } from '../lib/supabase';
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
  MixGroup,
  WishlistItem,
  DeliveryJob,
  DeliveryJobStatus,
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
      const result = await executeSql(
        'SELECT * FROM products ORDER BY created_at DESC',
      );
      const rows = (result.rows as any)._array || [];
      return rows.map((prod: any) => ({
        id: prod.id,
        name: prod.name,
        name_en: prod.name_en,
        name_he: prod.name_he,
        price: prod.price,
        originalPrice: prod.originalPrice ?? undefined,
        description: prod.description,
        description_en: prod.description_en,
        description_he: prod.description_he,
        category: prod.category,
        subcategory: prod.subcategory,
        images: prod.images ? JSON.parse(prod.images) : [],
        videos: prod.videos ? JSON.parse(prod.videos) : undefined,
        colors: prod.colors ? JSON.parse(prod.colors) : undefined,
        rating: prod.rating,
        reviews: prod.reviews,
        badges: prod.badges ? JSON.parse(prod.badges) : undefined,
        pricingTier: prod.pricing_tier ?? undefined,
        mixGroupId: prod.mix_group_id ?? undefined,
        stock: prod.stock,
        createdAt: prod.created_at,
        updatedAt: prod.updated_at,
      }));
    } catch (error) {
      console.error('Error in getProducts:', error);
      return [];
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const result = await executeSql(
        'SELECT * FROM products WHERE id = ? LIMIT 1',
        [id],
      );
      const item = (result.rows as any)._array?.[0];
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
        subcategory: item.subcategory,
        images: item.images ? JSON.parse(item.images) : [],
        videos: item.videos ? JSON.parse(item.videos) : undefined,
        colors: item.colors ? JSON.parse(item.colors) : undefined,
        rating: item.rating,
        reviews: item.reviews,
        badges: item.badges ? JSON.parse(item.badges) : undefined,
        pricingTier: item.pricing_tier ?? undefined,
        mixGroupId: item.mix_group_id ?? undefined,
        stock: item.stock,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    } catch (error) {
      console.error('Error in getProduct:', error);
      return null;
    }
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<string> {
    try {
      const dbProduct: any = {
        ...product,
        pricing_tier: (product as any).pricingTier,
        created_at: (product as any).createdAt,
        updated_at: (product as any).updatedAt,
      };

      if ((product as any).mixGroupId !== undefined) {
        dbProduct.mix_group_id = (product as any).mixGroupId;
      }

      if (!dbProduct.subcategory) {
        delete dbProduct.subcategory;
      }

      delete dbProduct.pricingTier;
      delete dbProduct.mixGroupId;
      delete dbProduct.createdAt;
      delete dbProduct.updatedAt;

      const id = `prod_${Date.now()}`;
      await executeSql(
        `INSERT INTO products (
          id, name, name_en, name_he, price, description, description_en,
          description_he, category, subcategory, images, videos, colors,
          rating, reviews, badges, pricing_tier, mix_group_id, stock,
          created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          dbProduct.name,
          dbProduct.name_en,
          dbProduct.name_he,
          dbProduct.price,
          dbProduct.description,
          dbProduct.description_en,
          dbProduct.description_he,
          dbProduct.category,
          dbProduct.subcategory ?? null,
          JSON.stringify(dbProduct.images || []),
          JSON.stringify(dbProduct.videos || []),
          JSON.stringify(dbProduct.colors || []),
          dbProduct.rating ?? 0,
          dbProduct.reviews ?? 0,
          JSON.stringify(dbProduct.badges || []),
          dbProduct.pricing_tier ?? null,
          dbProduct.mix_group_id ?? null,
          dbProduct.stock ?? 0,
          dbProduct.created_at || Date.now(),
          dbProduct.updated_at || Date.now(),
        ],
      );

      return id;
    } catch (error) {
      console.error('Error in addProduct:', error);
      throw error;
    }
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    try {
      const dbProduct: any = {
        ...product,
        pricing_tier: (product as any).pricingTier,
        updated_at: (product as any).updatedAt,
      };

      if ((product as any).mixGroupId !== undefined) {
        dbProduct.mix_group_id = (product as any).mixGroupId;
      }

      if (!dbProduct.subcategory) {
        delete dbProduct.subcategory;
      }

      delete dbProduct.pricingTier;
      delete dbProduct.mixGroupId;
      delete dbProduct.updatedAt;

      await executeSql(
        `UPDATE products SET
          name = ?,
          name_en = ?,
          name_he = ?,
          price = ?,
          description = ?,
          description_en = ?,
          description_he = ?,
          category = ?,
          subcategory = ?,
          images = ?,
          videos = ?,
          colors = ?,
          rating = ?,
          reviews = ?,
          badges = ?,
          pricing_tier = ?,
          mix_group_id = ?,
          stock = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          dbProduct.name,
          dbProduct.name_en,
          dbProduct.name_he,
          dbProduct.price,
          dbProduct.description,
          dbProduct.description_en,
          dbProduct.description_he,
          dbProduct.category,
          dbProduct.subcategory ?? null,
          JSON.stringify(dbProduct.images || []),
          JSON.stringify(dbProduct.videos || []),
          JSON.stringify(dbProduct.colors || []),
          dbProduct.rating ?? 0,
          dbProduct.reviews ?? 0,
          JSON.stringify(dbProduct.badges || []),
          dbProduct.pricing_tier ?? null,
          dbProduct.mix_group_id ?? null,
          dbProduct.stock ?? 0,
          dbProduct.updated_at || Date.now(),
          id,
        ],
      );
    } catch (error) {
      console.error('Error in updateProduct:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await executeSql('DELETE FROM products WHERE id = ?', [id]);
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
      const { data: subcategoriesData, error: subcategoriesError } =
        await supabase.from('subcategories').select('*').order('name');

      if (subcategoriesError) {
        console.error('Error fetching subcategories:', subcategoriesError);
        return categoriesData || [];
      }

      // Map subcategories to their parent categories
      const categories = categoriesData.map(
        (category: {
          id: any;
          name: any;
          name_en: any;
          name_he: any;
          icon: any;
          created_at: any;
        }) => {
          const subcategories = subcategoriesData
            .filter(
              (subcategory: { category_id: any }) =>
                subcategory.category_id === category.id
            )
            .map(
              (subcategory: {
                id: any;
                name: any;
                name_en: any;
                name_he: any;
                icon: any;
                category_id: any;
                created_at: any;
              }) => ({
                id: subcategory.id,
                name: subcategory.name,
                name_en: subcategory.name_en,
                name_he: subcategory.name_he,
                icon: subcategory.icon,
                categoryId: subcategory.category_id,
                createdAt: subcategory.created_at,
              })
            );

          return {
            id: category.id,
            name: category.name,
            name_en: category.name_en,
            name_he: category.name_he,
            icon: category.icon,
            subcategories,
            createdAt: category.created_at,
          };
        }
      );

      return categories;
    } catch (error) {
      console.error('Error in getCategories:', error);
      return [];
    }
  }

  async addCategory(category: Omit<Category, 'subcategories'>): Promise<void> {
    try {
      const { error } = await supabase.from('categories').insert([
        {
          id: category.id,
          name: category.name,
          name_en: category.name_en,
          name_he: category.name_he,
          icon: category.icon,
        },
      ]);

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
          icon: category.icon,
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
      const { error } = await supabase.from('categories').delete().eq('id', id);

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
  async addSubcategory(subcategory: Subcategory): Promise<void> {
    try {
      const { error } = await supabase.from('subcategories').insert([
        {
          id: subcategory.id,
          name: subcategory.name,
          name_en: subcategory.name_en,
          name_he: subcategory.name_he,
          icon: subcategory.icon,
          category_id: subcategory.categoryId,
        },
      ]);

      if (error) {
        console.error('Error adding subcategory:', error);
        throw new Error('Failed to add subcategory');
      }
    } catch (error) {
      console.error('Error in addSubcategory:', error);
      throw error;
    }
  }

  async updateSubcategory(
    id: string,
    subcategory: Partial<Subcategory>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('subcategories')
        .update({
          name: subcategory.name,
          name_en: subcategory.name_en,
          name_he: subcategory.name_he,
          icon: subcategory.icon,
          category_id: subcategory.categoryId,
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
      // First remove the subcategory reference from any products that currently
      // use it. This prevents a foreign key violation when deleting the
      // subcategory itself.
      const { error: updateError } = await supabase
        .from('products')
        .update({ subcategory: null })
        .eq('subcategory', id);

      if (updateError) {
        console.error(
          'Error reassigning products from subcategory:',
          updateError
        );
        throw new Error('Failed to reassign products from subcategory');
      }

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

      return (data || []).map(
        (room: {
          id: any;
          user_id: any;
          user_name: any;
          last_message: any;
          last_message_time: any;
          unread_count: any;
        }) => ({
          id: room.id,
          userId: room.user_id,
          userName: room.user_name,
          lastMessage: room.last_message,
          lastMessageTime: room.last_message_time,
          unreadCount: room.unread_count || 0,
        })
      );
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

      return (data || []).map(
        (msg: {
          id: any;
          sender_id: any;
          sender_name: any;
          message: any;
          timestamp: any;
          is_admin: any;
          audio_uri: any;
          audio_duration: any;
          reactions: any;
        }) => ({
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          message: msg.message,
          timestamp: msg.timestamp,
          isAdmin: msg.is_admin,
          audioUri: msg.audio_uri,
          audioDuration: msg.audio_duration,
          reactions: msg.reactions || {},
        })
      );
    } catch (error) {
      console.error('Error in getChatMessages:', error);
      return [];
    }
  }

  async sendChatMessage(roomId: string, message: ChatMessage): Promise<void> {
    try {
      const { error } = await supabase.from('chat_messages').insert([
        {
          id: message.id,
          room_id: roomId,
          sender_id: message.senderId,
          sender_name: message.senderName,
          message: message.message,
          timestamp: message.timestamp,
          is_admin: message.isAdmin,
          audio_uri: message.audioUri,
          audio_duration: message.audioDuration,
          reactions: message.reactions || {},
        },
      ]);

      if (error) {
        console.error('Error sending chat message:', error);
        throw new Error('Failed to send message');
      }

      // Update the chat room's last message and increment unread count
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('unread_count')
        .eq('id', roomId)
        .single();

      const currentCount = room?.unread_count ?? 0;

      await supabase
        .from('chat_rooms')
        .update({
          last_message: message.message || '🎵 Voice message',
          last_message_time: message.timestamp,
          unread_count: currentCount + 1,
        })
        .eq('id', roomId);
    } catch (error) {
      console.error('Error in sendChatMessage:', error);
      throw error;
    }
  }

  async markChatRoomRead(roomId: string): Promise<void> {
    try {
      await supabase
        .from('chat_rooms')
        .update({ unread_count: 0 })
        .eq('id', roomId);
    } catch (error) {
      console.error('Error in markChatRoomRead:', error);
    }
  }

  async getOrCreateChatRoom(userId: string, userName: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking chat room:', error);
      }

      if (data?.id) {
        return data.id;
      }

      const id = `room_${Date.now()}`;
      const { error: insertError } = await supabase.from('chat_rooms').insert([
        {
          id,
          user_id: userId,
          user_name: userName,
          last_message: '',
          last_message_time: Date.now(),
          unread_count: 0,
        },
      ]);

      if (insertError) {
        console.error('Error creating chat room:', insertError);
      }

      return id;
    } catch (err) {
      console.error('Error in getOrCreateChatRoom:', err);
      return `room_${Date.now()}`;
    }
  }

  async updateMessageReactions(
    messageId: string,
    reactions: Record<string, string[]>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions })
        .eq('id', messageId);
      if (error) {
        console.error('Error updating reactions:', error);
      }
    } catch (err) {
      console.error('Error in updateMessageReactions:', err);
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
        isDriver: data.role === 'driver',
        role: data.role,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        kycStatus: data.kyc_status,
        customerTier: data.customer_tier,
        kycRequestNotes: data.kyc_request_notes,
        kycRequestedAt: data.kyc_requested_at,
        kycApprovedBy: data.kyc_approved_by,
        kycApprovedAt: data.kyc_approved_at,
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

      return (data || []).map(
        (profile: {
          id: any;
          app_username: any;
          display_name: any;
          email: any;
          role: string;
          created_at: any;
          updated_at: any;
          kyc_status: any;
          customer_tier: any;
          kyc_request_notes: any;
          kyc_requested_at: any;
          kyc_approved_by: any;
          kyc_approved_at: any;
        }) => ({
          id: profile.id,
          username: profile.app_username,
          displayName: profile.display_name,
          email: profile.email,
          isAdmin: profile.role === 'admin',
          isDriver: profile.role === 'driver',
          role: profile.role,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          kycStatus: profile.kyc_status,
          customerTier: profile.customer_tier,
          kycRequestNotes: profile.kyc_request_notes,
          kycRequestedAt: profile.kyc_requested_at,
          kycApprovedBy: profile.kyc_approved_by,
          kycApprovedAt: profile.kyc_approved_at,
        })
      );
    } catch (error) {
      console.error('Error in getAllUserProfiles:', error);
      return [];
    }
  }

  async findUserProfileByMatrixId(matrixId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('matrix_user_id', matrixId)
        .single();

      if (error) {
        console.error('Error finding user profile:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.matrix_user_id,
        username: data.app_username,
        displayName: data.display_name,
        email: data.email,
        isAdmin: data.role === 'admin',
        isDriver: data.role === 'driver',
        role: data.role,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        kycStatus: data.kyc_status,
        customerTier: data.customer_tier,
        kycRequestNotes: data.kyc_request_notes,
        kycRequestedAt: data.kyc_requested_at,
        kycApprovedBy: data.kyc_approved_by,
        kycApprovedAt: data.kyc_approved_at,
      };
    } catch (error) {
      console.error('Error in findUserProfileByMatrixId:', error);
      return null;
    }
  }

  async searchUserProfiles(
    term: string
  ): Promise<
    { matrix_user_id: string; display_name: string; app_username: string }[]
  > {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('matrix_user_id, display_name, app_username')
        .or(`display_name.ilike.%${term}%,app_username.ilike.%${term}%`)
        .limit(10);

      if (error) {
        console.error('Error searching user profiles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchUserProfiles:', error);
      return [];
    }
  }

  async updateUserRole(
    userId: string,
    role: 'user' | 'driver' | 'admin'
  ): Promise<void> {
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

  async updateUserCustomerTier(
    userId: string,
    customerTier: string
  ): Promise<void> {
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
        kyc_status: status,
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
        .eq('id', userId);

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

      return (data || []).map(
        (profile: {
          matrix_user_id: any;
          app_username: any;
          display_name: any;
          email: any;
          role: string;
          created_at: any;
          updated_at: any;
          kyc_status: any;
          customer_tier: any;
          kyc_request_notes: any;
          kyc_requested_at: any;
          kyc_approved_by: any;
          kyc_approved_at: any;
        }) => ({
          id: profile.matrix_user_id,
          username: profile.app_username,
          displayName: profile.display_name,
          email: profile.email,
          isAdmin: profile.role === 'admin',
          isDriver: profile.role === 'driver',
          role: profile.role,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          kycStatus: profile.kyc_status,
          customerTier: profile.customer_tier,
          kycRequestNotes: profile.kyc_request_notes,
          kycRequestedAt: profile.kyc_requested_at,
          kycApprovedBy: profile.kyc_approved_by,
          kycApprovedAt: profile.kyc_approved_at,
        })
      );
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
      const { error } = await supabase.from('reviews').insert([review]);

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
      const { error } = await supabase.from('reviews').delete().eq('id', id);

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

      return (data || []).map((banner: any) => ({
        id: banner.id,
        title: banner.title,
        title_en: banner.title_en,
        title_he: banner.title_he,
        subtitle: banner.subtitle,
        subtitle_en: banner.subtitle_en,
        subtitle_he: banner.subtitle_he,
        image: banner.image,
        discount: banner.discount,
        discount_en: banner.discount_en,
        discount_he: banner.discount_he,
        category: banner.category,
        isActive: banner.is_active,
        order: banner.order,
        createdAt: banner.created_at,
        updatedAt: banner.updated_at,
      }));
    } catch (error) {
      console.error('Error in getHeroBanners:', error);
      return [];
    }
  }

  async addHeroBanner(
    banner: Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const dbBanner: any = {
        ...banner,
        is_active: banner.isActive,
        discount: (banner as any).discount ?? '',
      };

      delete dbBanner.isActive;
      delete dbBanner.discount_en;
      delete dbBanner.discount_he;

      const { data, error } = await supabase
        .from('hero_banners')
        .insert([dbBanner])
        .select()
        .single();

      if (error) {
        console.error('Error adding hero banner:', error);
        throw new Error('Failed to add hero banner');
      }

      return data.id;
    } catch (error) {
      console.error('Error in addHeroBanner:', error);
      throw error;
    }
  }

  async updateHeroBanner(
    id: string,
    banner: Partial<HeroBanner>
  ): Promise<void> {
    try {
      const dbBanner: any = {
        ...banner,
        is_active: banner.isActive,
        updated_at: (banner as any).updatedAt,
        discount: (banner as any).discount ?? '',
      };

      delete dbBanner.isActive;
      delete dbBanner.updatedAt;
      delete dbBanner.discount_en;
      delete dbBanner.discount_he;

      const { error } = await supabase
        .from('hero_banners')
        .update(dbBanner)
        .eq('id', id);

      if (error) {
        console.error('Error updating hero banner:', error);
        throw new Error('Failed to update hero banner');
      }
    } catch (error) {
      console.error('Error in updateHeroBanner:', error);
      throw error;
    }
  }

  async deleteHeroBanner(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('hero_banners')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting hero banner:', error);
        throw new Error('Failed to delete hero banner');
      }
    } catch (error) {
      console.error('Error in deleteHeroBanner:', error);
      throw error;
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
        if (rulesError.code === '42P01') {
          console.warn('price_tier_rules table missing, skipping rules fetch');
        } else {
          console.error('Error fetching pricing tier rules:', rulesError);
        }
      }

      const effectiveRules =
        rulesError && rulesError.code === '42P01' ? [] : rulesData || [];

      return (tiersData || []).map(
        (tier: {
          id: any;
          name: any;
          name_en: any;
          name_he: any;
          price_per_unit: any;
          min_quantity: any;
          description: any;
          description_en: any;
          description_he: any;
          created_at: any;
        }) => ({
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
          rules: effectiveRules
            .filter((r: { tier_id: any }) => r.tier_id === tier.id)
            .sort(
              (a: { min_qty: number }, b: { min_qty: number }) =>
                a.min_qty - b.min_qty
            )
            .map(
              (r: {
                id: any;
                tier_id: any;
                min_qty: any;
                max_qty: any;
                price_per_unit: any;
                discount_pct: any;
                created_at: any;
                updated_at: any;
              }) => ({
                id: r.id,
                tierId: r.tier_id,
                minQty: r.min_qty,
                maxQty: r.max_qty,
                pricePerBaseUnit: r.price_per_unit,
                discountPct: r.discount_pct,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
              })
            ),
        })
      );
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
        if (rulesError.code === '42P01') {
          console.warn('price_tier_rules table missing, skipping rules fetch');
        } else {
          console.error('Error fetching pricing tier rules:', rulesError);
        }
      }

      const effectiveRules =
        rulesError && rulesError.code === '42P01' ? [] : rulesData || [];

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
        rules: effectiveRules.map(
          (r: {
            id: any;
            tier_id: any;
            min_qty: any;
            max_qty: any;
            price_per_unit: any;
            discount_pct: any;
            created_at: any;
            updated_at: any;
          }) => ({
            id: r.id,
            tierId: r.tier_id,
            minQty: r.min_qty,
            maxQty: r.max_qty,
            pricePerBaseUnit: r.price_per_unit,
            discountPct: r.discount_pct,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          })
        ),
      };
    } catch (error) {
      console.error('Error in getPricingTier:', error);
      return null;
    }
  }

  async addPricingTier(tier: PricingTier): Promise<void> {
    try {
      const { error } = await supabase.from('pricing_tiers').insert([
        {
          id: tier.id,
          name: tier.name,
          name_en: tier.name_en,
          name_he: tier.name_he,
          price_per_unit: tier.pricePerUnit, // Changed from discount to price_per_unit
          min_quantity: tier.minQuantity,
          description: tier.description,
          description_en: tier.description_en,
          description_he: tier.description_he,
        },
      ]);

      if (error) {
        console.error('Error adding pricing tier:', error);
        throw new Error('Failed to add pricing tier');
      }

      if (tier.rules && tier.rules.length > 0) {
        const rulesToInsert = tier.rules.map((r) => ({
          tier_id: tier.id,
          min_qty: r.minQty,
          max_qty: r.maxQty,
          price_per_unit: r.pricePerBaseUnit,
          discount_pct: r.discountPct,
        }));
        const { error: ruleError } = await supabase
          .from('price_tier_rules')
          .insert(rulesToInsert);
        if (ruleError) {
          if (ruleError.code === '42P01') {
            console.warn(
              'price_tier_rules table missing, skipping rules insertion'
            );
          } else {
            console.error('Error adding pricing tier rules:', ruleError);
            throw new Error('Failed to add pricing tier rules');
          }
        }
      }
    } catch (error) {
      console.error('Error in addPricingTier:', error);
      throw error;
    }
  }

  async updatePricingTier(
    id: string,
    tier: Partial<PricingTier>
  ): Promise<void> {
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
          description_he: tier.description_he,
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating pricing tier:', error);
        throw new Error('Failed to update pricing tier');
      }

      if (tier.rules) {
        const { error: deleteError } = await supabase
          .from('price_tier_rules')
          .delete()
          .eq('tier_id', id);

        if (deleteError && deleteError.code !== '42P01') {
          console.error('Error clearing pricing tier rules:', deleteError);
          throw new Error('Failed to update pricing tier rules');
        }

        if (tier.rules.length > 0) {
          const rulesToInsert = tier.rules.map((r) => ({
            tier_id: id,
            min_qty: r.minQty,
            max_qty: r.maxQty,
            price_per_unit: r.pricePerBaseUnit,
            discount_pct: r.discountPct,
          }));
          const { error: ruleError } = await supabase
            .from('price_tier_rules')
            .insert(rulesToInsert);
          if (ruleError) {
            if (ruleError.code === '42P01') {
              console.warn(
                'price_tier_rules table missing, skipping rules insertion'
              );
            } else {
              console.error('Error updating pricing tier rules:', ruleError);
              throw new Error('Failed to update pricing tier rules');
            }
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

      return (data || []).map(
        (group: {
          id: any;
          name: any;
          conversion_factor: any;
          created_at: any;
        }) => ({
          id: group.id,
          name: group.name,
          conversionFactor: group.conversion_factor,
          createdAt: group.created_at,
        })
      );
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
        createdAt: data.created_at,
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
        .insert([
          {
            id: group.id,
            name: group.name,
            conversion_factor: group.conversionFactor,
          },
        ]);

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
          conversion_factor: group.conversionFactor,
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

      const { error } = await supabase.from('mix_groups').delete().eq('id', id);

      if (error) {
        console.error('Error deleting mix group:', error);
        throw new Error('Failed to delete mix group');
      }
    } catch (error) {
      console.error('Error in deleteMixGroup:', error);
      throw error;
    }
  }

  // Wishlist
  async getWishlistItems(userId: string): Promise<WishlistItem[]> {
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('id, product_id, added_at')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) {
        // Table might not exist if migrations haven't run
        if (error.code === '42P01') {
          throw new Error('WISHLIST_TABLE_MISSING');
        }
        console.error('Error fetching wishlist items:', error);
        return [];
      }

      const items = data || [];

      const wishlistWithProducts = await Promise.all(
        items.map(async (item: any) => {
          const product = await this.getProduct(item.product_id);
          if (!product) {
            return null;
          }

          return {
            id: item.id,
            productId: item.product_id,
            product,
            addedAt: item.added_at,
          } as WishlistItem;
        })
      );

      return wishlistWithProducts.filter(Boolean) as WishlistItem[];
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'WISHLIST_TABLE_MISSING'
      ) {
        throw error;
      }
      console.error('Error in getWishlistItems:', error);
      return [];
    }
  }

  async addWishlistItem(userId: string, productId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .insert([{ user_id: userId, product_id: productId }]);

      if (error) {
        if (error.code === '42P01') {
          // Wishlist not supported on this backend
          return;
        }
        console.error('Error adding wishlist item:', error);
        throw new Error('Failed to add wishlist item');
      }
    } catch (error) {
      console.error('Error in addWishlistItem:', error);
      throw error;
    }
  }

  async removeWishlistItem(userId: string, productId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        if (error.code === '42P01') {
          return;
        }
        console.error('Error removing wishlist item:', error);
        throw new Error('Failed to remove wishlist item');
      }
    } catch (error) {
      console.error('Error in removeWishlistItem:', error);
      throw error;
    }
  }

  // Orders
  async getUserOrders(
    userId: string
  ): Promise<
    { id: string; total: number; status: string; createdAt: string }[]
  > {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user orders:', error);
        return [];
      }

      return (data || []).map((o: any) => ({
        id: o.id,
        total: Number(o.total),
        status: o.status,
        createdAt: o.created_at,
      }));
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      return [];
    }
  }

  // Delivery Jobs
  async getDeliveryJobsForDriver(driverId: string): Promise<DeliveryJob[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_jobs')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching delivery jobs:', error);
        return [];
      }

      return (data || []).map(
        (job: {
          id: any;
          order_id: any;
          driver_id: any;
          status: any;
          pickup_time: any;
          dropoff_time: any;
          proof_uri: any;
          created_at: any;
          updated_at: any;
        }) => ({
          id: job.id,
          orderId: job.order_id,
          driverId: job.driver_id,
          status: job.status,
          pickupTime: job.pickup_time || undefined,
          dropoffTime: job.dropoff_time || undefined,
          proofUri: job.proof_uri || undefined,
          createdAt: job.created_at,
          updatedAt: job.updated_at,
        })
      );
    } catch (error) {
      console.error('Error in getDeliveryJobsForDriver:', error);
      return [];
    }
  }

  async getAllDeliveryJobs(): Promise<DeliveryJob[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching delivery jobs:', error);
        return [];
      }

      return (data || []).map(
        (job: {
          id: any;
          order_id: any;
          driver_id: any;
          status: any;
          pickup_time: any;
          dropoff_time: any;
          proof_uri: any;
          created_at: any;
          updated_at: any;
        }) => ({
          id: job.id,
          orderId: job.order_id,
          driverId: job.driver_id,
          status: job.status,
          pickupTime: job.pickup_time || undefined,
          dropoffTime: job.dropoff_time || undefined,
          proofUri: job.proof_uri || undefined,
          createdAt: job.created_at,
          updatedAt: job.updated_at,
        })
      );
    } catch (error) {
      console.error('Error in getAllDeliveryJobs:', error);
      return [];
    }
  }

  async createDeliveryJob(orderId: string, driverId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('delivery_jobs')
        .insert([
          { order_id: orderId, driver_id: driverId, status: 'pending' },
        ]);

      if (error) {
        console.error('Error creating delivery job:', error);
        throw new Error('Failed to create delivery job');
      }
    } catch (error) {
      console.error('Error in createDeliveryJob:', error);
      throw error;
    }
  }

  async updateDeliveryJobStatus(
    jobId: string,
    status: DeliveryJobStatus
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('delivery_jobs')
        .update({ status })
        .eq('id', jobId);

      if (error) {
        console.error('Error updating delivery job status:', error);
        throw new Error('Failed to update delivery job status');
      }
    } catch (error) {
      console.error('Error in updateDeliveryJobStatus:', error);
      throw error;
    }
  }

  async updateDeliveryJobProof(jobId: string, proofUri: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('delivery_jobs')
        .update({ proof_uri: proofUri })
        .eq('id', jobId);

      if (error) {
        console.error('Error updating delivery job proof:', error);
        throw new Error('Failed to update delivery job proof');
      }
    } catch (error) {
      console.error('Error in updateDeliveryJobProof:', error);
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
        const { error } = await supabase.from('settings').insert([
          {
            key,
            value,
            type: 'string',
            description: `Setting for ${key}`,
          },
        ]);

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
      return (data || []).reduce(
        (
          acc: { [x: string]: any },
          item: { key: string | number; value: any }
        ) => {
          acc[item.key] = item.value;
          return acc;
        },
        {} as Record<string, string>
      );
    } catch (error) {
      console.error('Error in getAllSettings:', error);
      return {};
    }
  }

  // Tenant specific settings
  async getTenantSetting(tenant: string, key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select(`${key}`)
        .eq('tenant', tenant)
        .single();

      if (error) {
        console.error(`Error fetching tenant setting ${key}:`, error);
        return null;
      }

      return data ? (data as any)[key] || null : null;
    } catch (error) {
      console.error(`Error in getTenantSetting for ${key}:`, error);
      return null;
    }
  }

  async updateTenantSetting(
    tenant: string,
    key: string,
    value: string
  ): Promise<void> {
    try {
      const { data } = await supabase
        .from('tenant_settings')
        .select('tenant')
        .eq('tenant', tenant)
        .single();

      if (data) {
        const { error } = await supabase
          .from('tenant_settings')
          .update({ [key]: value })
          .eq('tenant', tenant);

        if (error) {
          console.error(`Error updating tenant setting ${key}:`, error);
          throw new Error(`Failed to update tenant setting ${key}`);
        }
      } else {
        const { error } = await supabase
          .from('tenant_settings')
          .insert([{ tenant, [key]: value }]);

        if (error) {
          console.error(`Error inserting tenant setting ${key}:`, error);
          throw new Error(`Failed to insert tenant setting ${key}`);
        }
      }
    } catch (error) {
      console.error(`Error in updateTenantSetting for ${key}:`, error);
      throw error;
    }
  }
}

export default DatabaseService;
