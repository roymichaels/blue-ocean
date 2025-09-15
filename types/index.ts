export interface ProductVariant {
  color: string;
  stock: number;
}

export interface Product {
  id: string;
  tenant_id?: string;
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
  variants?: ProductVariant[];
  rating: number;
  reviews: number;
  badges?: string[];
  pricingTier?: string;
  mixGroupId?: string;
  storeId: string;
  stock: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductIndexItem {
  id: string;
  storeId: string;
  price: number;
  metadataUri: string;
  image: string;
}

export interface Store {
  id: string;
  name: string;
  owner: string;
  nftId: string;
  reputation?: number;
  plan?: 'free' | 'premium';
  createdAt?: string;
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
  userPublicKey?: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type CustomerTier = 'new' | 'regular' | 'vip' | 'banned';
export type UserRole = 'user' | 'driver' | 'admin' | 'store-owner' | 'platform-admin';
export type AdminScope = 'admin:settings' | 'admin:users' | 'admin:orders';
export const ALL_ADMIN_SCOPES: AdminScope[] = [
  'admin:settings',
  'admin:users',
  'admin:orders',
];

export interface User {
  id: string;
  tenant_id?: string;
  username: string;
  isAdmin: boolean;
  isDriver?: boolean;
  displayName: string;
  passwordHash?: string;
  avatar?: string;
  email?: string;
  role?: UserRole;
  publicKey?: string;
  chatPublicKey?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
  kycStatus?: KycStatus;
  customerTier?: CustomerTier;
  kycRequestNotes?: string;
  kycRequestedAt?: string;
  kycApprovedBy?: string;
  kycApprovedAt?: string;
  kycDocumentUri?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string;
  type: 'order' | 'promo' | 'message' | 'system';
  read: boolean;
  timestamp: number;
}

export interface Report {
  id: string;
  type: 'product' | 'store';
  targetId: string;
  reason: string;
  reporter: string;
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
  discount?: string;
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

export type PaymentMethod = 'cash_on_delivery' | 'near' | 'card';

export interface Order {
  id: string;
  tenant_id?: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  shipAddrEnc?: {
    cipher: string;
    from: string;
  };
  paymentMethod: PaymentMethod;
  buyerAddress?: string;
  sellerAddress?: string;
  driverAddress?: string;
  sessionToken?: string;
  paymentContractAddress?: string;
  escrowAddr?: string;
  disputeEvidenceUri?: string;
  itemsHash: string;
  createdAt: string;
  updatedAt: string;
  trackingSteps: OrderTrackingStep[];
  paymentTxHash?: string;
  platformFee?: number;
  sellerPayout?: number;
}

export type OrderStatus =
  | 'order_received'      // הזמנה התקבלה
  | 'courier_found'       // נמצא שליח מתאים
  | 'courier_picked_up'   // שליח אסף את ההזמנה
  | 'courier_on_way'      // שליח בדרך אלייך
  | 'delivered'           // הזמנה התקבלה
  | 'disputed'            // מחלוקת פתוחה
  | 'released'            // תשלום שוחרר
  | 'refunded';           // תשלום הוחזר

export interface OrderTrackingStep {
  status: OrderStatus;
  title: string;
  timestamp: string;
  completed: boolean;
}

export type DeliveryJobStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface DeliveryJob {
  id: string;
  orderId: string;
  driverId: string;
  status: DeliveryJobStatus;
  pickupTime?: string;
  dropoffTime?: string;
  proofUri?: string;
  createdAt: string;
  updatedAt: string;
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

export interface TenantSettings {
  tenantId: string;
  appName?: string | null;
  theme?: { primary?: string | null };
  brand?: { logoCid?: string | null };
  fiatKey?: string | null;
  rpcUrl?: string | null;
  rpcFallbackUrls?: string[] | null;
  feeAddress?: string | null;
  feeBps?: number | null;
  admins?: string[] | null;
  paymentFactoryAddress?: string | null;
}

export interface RoadmapTask {
  id: string;
  roadmapId: string;
  title: string;
  order: number;
  completed: boolean;
}

export interface Roadmap {
  id: string;
  title: string;
  tasks: RoadmapTask[];
  active?: boolean;
}
