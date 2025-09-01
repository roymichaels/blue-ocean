import {
  Product,
  Order,
  Category,
  Store,
  Notification,
  User,
  CartItem,
  ChatRoom,
  Report,
  Review,
} from '../types';

export type PayloadTypes =
  | 'Product'
  | 'Order'
  | 'Category'
  | 'Store'
  | 'Notification'
  | 'User'
  | 'CartItem'
  | 'ChatRoom'
  | 'Report'
  | 'Review'
  | 'Admins';

const requiredFields: Record<PayloadTypes, string[]> = {
  Product: [
    'id',
    'name',
    'price',
    'description',
    'category',
    'images',
    'rating',
    'reviews',
    'storeId',
    'stock',
  ],
  Order: [
    'id',
    'userId',
    'items',
    'total',
    'status',
    'shippingAddress',
    'paymentMethod',
    'itemsHash',
    'createdAt',
    'updatedAt',
    'trackingSteps',
  ],
  Category: ['id', 'name', 'icon'],
  Store: ['id', 'name', 'owner', 'nftId'],
  Notification: ['id', 'userId', 'title', 'message', 'type', 'read', 'timestamp'],
  User: ['address'],
  CartItem: ['id', 'productId', 'product', 'quantity', 'addedAt'],
  ChatRoom: ['id', 'userId', 'userName', 'lastMessage', 'lastMessageTime', 'unreadCount'],
  Report: ['id', 'type', 'targetId', 'reason', 'reporter', 'timestamp'],
  Review: ['id', 'orderId', 'productId', 'rating', 'userId'],
  Admins: ['length'],
};

export function normalizeMessage<T>(type: PayloadTypes, payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid message payload');
  }
  const keys = requiredFields[type];
  for (const k of keys) {
    if (!(k in (payload as Record<string, unknown>))) {
      throw new Error('Invalid message payload');
    }
  }
  return payload as T;
}
