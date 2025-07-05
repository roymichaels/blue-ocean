export interface Product {
  id: string;
  name: string;
  name_en?: string;
  name_he?: string;
  price: number;
  originalPrice?: number;
  description: string;
  description_en?: string;
  description_he?: string;
  category: string;
  subcategory?: string;
  images: string[];
  videos?: string[];
  colors?: string[];
  rating: number;
  reviews: number;
  badges?: string[];
  pricingTier?: string;
  mixGroupId?: string;
  stock: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_he?: string;
  icon: string;
  subcategories?: Subcategory[];
  createdAt?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  name_en?: string;
  name_he?: string;
  icon: string;
  categoryId: string;
  createdAt?: string;
}

export interface PricingTier {
  id: string;
  name: string;
  name_en?: string;
  name_he?: string;
  pricePerUnit?: number; // Changed from discount to pricePerUnit
  minQuantity: number;
  description: string;
  description_en?: string;
  description_he?: string;
  createdAt?: string;
  rules?: PricingTierRule[];
}

export interface PricingTierRule {
  id: string;
  tierId: string;
  minQty: number;
  maxQty: number;
  pricePerBaseUnit?: number;
  discountPct?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MixGroup {
  id: string;
  name: string;
  conversionFactor: number;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  isAdmin: boolean;
  audioUri?: string;
  audioDuration?: number;
  reactions?: Record<string, string[]>; // emoji -> array of user IDs
}

export interface ChatRoom {
  id: string;
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type CustomerTier = 'new' | 'regular' | 'vip' | 'banned';

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  isDriver?: boolean;
  displayName: string;
  avatar?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  kycStatus?: KycStatus;
  customerTier?: CustomerTier;
  kycRequestNotes?: string;
  kycRequestedAt?: string;
  kycApprovedBy?: string;
  kycApprovedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'message' | 'system';
  read: boolean;
  timestamp: number;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  orderId?: string; // Added for order-based reviews
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  title: string;
  comment?: string;
  date: string;
  helpful: number;
  verified: boolean;
}

export interface HeroBanner {
  id: string;
  title: string;
  title_en?: string;
  title_he?: string;
  subtitle: string;
  subtitle_en?: string;
  subtitle_he?: string;
  image: string;
  discount: string;
  discount_en?: string;
  discount_he?: string;
  category: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  addedAt: string;
  unitPrice?: number;
  tierName?: string;
  effectiveQty?: number;
  selectedColor?: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paymentMethod: 'cash_on_delivery';
  createdAt: string;
  updatedAt: string;
  trackingSteps: OrderTrackingStep[];
}

export type OrderStatus = 
  | 'order_received'      // הזמנה התקבלה
  | 'courier_found'       // נמצא שליח מתאים
  | 'courier_picked_up'   // שליח אסף את ההזמנה
  | 'courier_on_way'      // שליח בדרך אלייך
  | 'delivered';          // הזמנה התקבלה

export interface OrderTrackingStep {
  status: OrderStatus;
  title: string;
  timestamp: string;
  completed: boolean;
}

export interface ShippingAddress {
  id?: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  notes?: string;
}