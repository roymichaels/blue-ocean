import { uuid } from '@/utils/uuid';

export type DomainErrorCode =
  | '{E_UNAUTHORIZED}'
  | '{E_SIGNATURE_INVALID}'
  | '{E_DUPLICATE}'
  | '{E_VALIDATION}';

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'DomainError';
  }
}

export type UserRole = 'admin' | 'buyer';

export interface User {
  id: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  admins: string[];
}

export type ProductStatus = 'active' | 'hidden';

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  price: number;
  stock: number;
  status: ProductStatus;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export type PaymentMethod = 'card' | 'cash' | 'crypto' | 'other';

export interface PaymentSummary {
  method: PaymentMethod;
  status: 'paid' | 'pending';
  reference?: string;
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled';

export interface Order {
  id: string;
  tenantId: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment: PaymentSummary;
  createdAt: number;
  updatedAt: number;
}

export interface AdminRequestEvent {
  type: 'admin.requested';
  payload: { userId: string; requestedAt: number };
}

export interface AdminRegisteredEvent {
  type: 'admin.registered';
  payload: { userId: string; registeredAt: number; approvedBy?: string };
}

export interface StoreCreatedEvent {
  type: 'store.created';
  payload: { store: Tenant; createdBy: string };
}

export interface StoreUpdatedEvent {
  type: 'store.updated';
  payload: { store: Tenant; updatedBy: string };
}

export interface ProductAddedEvent {
  type: 'product.added';
  payload: { product: Product; addedBy: string };
}

export interface ProductUpdatedEvent {
  type: 'product.updated';
  payload: { product: Product; updatedBy: string };
}

export interface ProductHiddenEvent {
  type: 'product.hidden';
  payload: { product: Product; hiddenBy: string };
}

export interface OrderCreatedEvent {
  type: 'order.created';
  payload: { order: Order };
}

export interface OrderStatusChangedEvent {
  type: 'order.statusChanged';
  payload: {
    orderId: string;
    tenantId: string;
    from: OrderStatus;
    to: OrderStatus;
    changedAt: number;
    updatedBy: string;
  };
}

export type DomainEvent =
  | AdminRequestEvent
  | AdminRegisteredEvent
  | StoreCreatedEvent
  | StoreUpdatedEvent
  | ProductAddedEvent
  | ProductUpdatedEvent
  | ProductHiddenEvent
  | OrderCreatedEvent
  | OrderStatusChangedEvent;

export interface DomainDependencies {
  now?: () => Date;
  generateId?: () => string;
}

export interface TenantInput {
  id?: string;
  name: string;
}

export interface TenantUpdate {
  name?: string;
}

export interface ProductInput {
  id?: string;
  name: string;
  price: number;
  stock?: number;
  description?: string;
}

export interface ProductUpdate {
  name?: string;
  price?: number;
  stock?: number;
  description?: string;
}

export interface CheckoutPayment {
  method?: PaymentMethod;
  paid?: boolean;
  reference?: string;
}

interface UserRecord extends User {}

interface TenantRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  admins: Set<string>;
}

interface ProductRecord {
  id: string;
  tenantId: string;
  name: string;
  price: number;
  stock: number;
  status: ProductStatus;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface CartItemRecord extends CartItem {}

interface OrderRecord {
  id: string;
  tenantId: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment: PaymentSummary;
  createdAt: number;
  updatedAt: number;
}

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
};

function ensureValidName(name: string | undefined, field: string): string {
  if (!name || !name.trim()) {
    throw new DomainError('{E_VALIDATION}', `${field} is required`);
  }
  return name.trim();
}

function ensureNonNegativeNumber(value: number | undefined, field: string): number {
  if (value === undefined || Number.isNaN(value) || value < 0) {
    throw new DomainError('{E_VALIDATION}', `${field} must be a non-negative number`);
  }
  return value;
}

function cloneTenant(record: TenantRecord): Tenant {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    admins: Array.from(record.admins),
  };
}

function cloneProduct(record: ProductRecord): Product {
  return {
    id: record.id,
    tenantId: record.tenantId,
    name: record.name,
    price: record.price,
    stock: record.stock,
    status: record.status,
    description: record.description,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function cloneOrder(record: OrderRecord): Order {
  return {
    id: record.id,
    tenantId: record.tenantId,
    userId: record.userId,
    items: record.items.map((item) => ({ ...item })),
    total: record.total,
    status: record.status,
    payment: { ...record.payment },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class StoreDomain {
  private readonly now: () => number;
  private readonly generateId: () => string;
  private readonly events: DomainEvent[] = [];
  private readonly listeners = new Set<(event: DomainEvent) => void>();

  private readonly users = new Map<string, UserRecord>();
  private readonly tenants = new Map<string, TenantRecord>();
  private readonly products = new Map<string, ProductRecord>();
  private readonly tenantProducts = new Map<string, Set<string>>();
  private readonly carts = new Map<string, CartItemRecord[]>();
  private readonly orders = new Map<string, OrderRecord>();
  private readonly tenantOrders = new Map<string, Set<string>>();
  private readonly adminRequests = new Map<string, number>();
  private readonly admins = new Set<string>();

  constructor(dependencies: DomainDependencies = {}) {
    this.now = () => dependencies.now?.().getTime() ?? Date.now();
    this.generateId = () => dependencies.generateId?.() ?? uuid();
  }

  onEvent(listener: (event: DomainEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getEvents(): DomainEvent[] {
    return [...this.events];
  }

  drainEvents(): DomainEvent[] {
    const copy = [...this.events];
    this.events.length = 0;
    return copy;
  }

  private emit(event: DomainEvent): DomainEvent {
    this.events.push(event);
    for (const listener of this.listeners) {
      listener(event);
    }
    return event;
  }

  private ensureUser(userId: string, role: UserRole = 'buyer'): void {
    if (!userId) {
      throw new DomainError('{E_VALIDATION}', 'userId is required');
    }
    const existing = this.users.get(userId);
    const timestamp = this.now();
    if (!existing) {
      this.users.set(userId, {
        id: userId,
        role,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } else if (role === 'admin' && existing.role !== 'admin') {
      existing.role = 'admin';
      existing.updatedAt = timestamp;
    }
  }

  private requireTenant(tenantId: string): TenantRecord {
    const record = this.tenants.get(tenantId);
    if (!record) {
      throw new DomainError('{E_VALIDATION}', `Store ${tenantId} not found`);
    }
    return record;
  }

  private requireProduct(productId: string): ProductRecord {
    const record = this.products.get(productId);
    if (!record) {
      throw new DomainError('{E_VALIDATION}', `Product ${productId} not found`);
    }
    return record;
  }

  private cartKey(tenantId: string, userId: string): string {
    return `${tenantId}::${userId}`;
  }

  private ensureAdmin(userId: string): void {
    if (!this.admins.has(userId)) {
      throw new DomainError('{E_UNAUTHORIZED}', 'Admin privileges required');
    }
  }

  private ensureAdminForTenant(userId: string, tenantId: string): TenantRecord {
    this.ensureAdmin(userId);
    const tenant = this.requireTenant(tenantId);
    if (!tenant.admins.has(userId)) {
      tenant.admins.add(userId);
    }
    return tenant;
  }

  requestAdminAccess(userId: string, signatureValid = true): AdminRequestEvent {
    if (!signatureValid) {
      throw new DomainError('{E_SIGNATURE_INVALID}', 'Invalid admin request signature');
    }
    if (!userId || !userId.trim()) {
      throw new DomainError('{E_VALIDATION}', 'userId is required');
    }
    const normalized = userId.trim();
    if (this.admins.has(normalized)) {
      throw new DomainError('{E_DUPLICATE}', 'Admin already registered');
    }
    if (this.adminRequests.has(normalized)) {
      throw new DomainError('{E_DUPLICATE}', 'Admin request already pending');
    }
    const requestedAt = this.now();
    this.adminRequests.set(normalized, requestedAt);
    this.ensureUser(normalized, 'buyer');
    const event: AdminRequestEvent = {
      type: 'admin.requested',
      payload: { userId: normalized, requestedAt },
    };
    return this.emit(event);
  }

  registerAdmin(userId: string, approvedBy?: string): AdminRegisteredEvent {
    if (!userId || !userId.trim()) {
      throw new DomainError('{E_VALIDATION}', 'userId is required');
    }
    const normalized = userId.trim();
    const isBootstrap = this.admins.size === 0;
    if (!isBootstrap) {
      if (!approvedBy) {
        throw new DomainError('{E_UNAUTHORIZED}', 'Admin approval requires an existing admin');
      }
      if (!this.admins.has(approvedBy)) {
        throw new DomainError('{E_UNAUTHORIZED}', 'Approver must be an admin');
      }
    }
    if (this.admins.has(normalized)) {
      throw new DomainError('{E_DUPLICATE}', 'Admin already registered');
    }
    const requested = this.adminRequests.get(normalized);
    if (!isBootstrap && requested === undefined) {
      throw new DomainError('{E_VALIDATION}', 'Admin must request access before approval');
    }
    this.adminRequests.delete(normalized);
    this.ensureUser(normalized, 'admin');
    this.admins.add(normalized);
    const timestamp = this.now();
    const event: AdminRegisteredEvent = {
      type: 'admin.registered',
      payload: { userId: normalized, registeredAt: timestamp, approvedBy },
    };
    // Attach new admin to existing stores for convenience.
    for (const tenant of this.tenants.values()) {
      tenant.admins.add(normalized);
    }
    return this.emit(event);
  }

  getAdmins(): string[] {
    return Array.from(this.admins);
  }

  getPendingAdminRequests(): { userId: string; requestedAt: number }[] {
    return Array.from(this.adminRequests.entries()).map(([userId, requestedAt]) => ({
      userId,
      requestedAt,
    }));
  }

  createStore(adminId: string, input: TenantInput): StoreCreatedEvent {
    this.ensureUser(adminId, 'admin');
    if (this.admins.size === 0 || !this.admins.has(adminId)) {
      throw new DomainError('{E_UNAUTHORIZED}', 'Only registered admins can create stores');
    }
    const name = ensureValidName(input.name, 'Store name');
    const id = input.id?.trim() || this.generateId();
    if (this.tenants.has(id)) {
      throw new DomainError('{E_DUPLICATE}', `Store ${id} already exists`);
    }
    const timestamp = this.now();
    const record: TenantRecord = {
      id,
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
      admins: new Set([adminId]),
    };
    this.tenants.set(id, record);
    this.tenantProducts.set(id, new Set());
    this.tenantOrders.set(id, new Set());
    const store = cloneTenant(record);
    const event: StoreCreatedEvent = {
      type: 'store.created',
      payload: { store, createdBy: adminId },
    };
    return this.emit(event);
  }

  updateStore(adminId: string, tenantId: string, updates: TenantUpdate): StoreUpdatedEvent {
    const tenant = this.ensureAdminForTenant(adminId, tenantId);
    let changed = false;
    if (updates.name !== undefined) {
      tenant.name = ensureValidName(updates.name, 'Store name');
      changed = true;
    }
    if (!changed) {
      throw new DomainError('{E_VALIDATION}', 'No store updates provided');
    }
    tenant.updatedAt = this.now();
    const event: StoreUpdatedEvent = {
      type: 'store.updated',
      payload: { store: cloneTenant(tenant), updatedBy: adminId },
    };
    return this.emit(event);
  }

  getStore(tenantId: string): Tenant | null {
    const tenant = this.tenants.get(tenantId);
    return tenant ? cloneTenant(tenant) : null;
  }

  listStores(): Tenant[] {
    return Array.from(this.tenants.values()).map(cloneTenant);
  }

  addProduct(adminId: string, tenantId: string, input: ProductInput): ProductAddedEvent {
    const tenant = this.ensureAdminForTenant(adminId, tenantId);
    const name = ensureValidName(input.name, 'Product name');
    const price = ensureNonNegativeNumber(input.price, 'Product price');
    const stock = ensureNonNegativeNumber(input.stock ?? 0, 'Product stock');
    const id = input.id?.trim() || this.generateId();
    if (this.products.has(id)) {
      throw new DomainError('{E_DUPLICATE}', `Product ${id} already exists`);
    }
    const timestamp = this.now();
    const record: ProductRecord = {
      id,
      tenantId: tenant.id,
      name,
      price,
      stock,
      status: 'active',
      description: input.description?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.products.set(id, record);
    const productSet = this.tenantProducts.get(tenantId) ?? new Set<string>();
    productSet.add(id);
    this.tenantProducts.set(tenantId, productSet);
    const event: ProductAddedEvent = {
      type: 'product.added',
      payload: { product: cloneProduct(record), addedBy: adminId },
    };
    return this.emit(event);
  }

  updateProduct(adminId: string, productId: string, updates: ProductUpdate): ProductUpdatedEvent {
    const product = this.requireProduct(productId);
    this.ensureAdminForTenant(adminId, product.tenantId);
    let changed = false;
    if (updates.name !== undefined) {
      product.name = ensureValidName(updates.name, 'Product name');
      changed = true;
    }
    if (updates.price !== undefined) {
      product.price = ensureNonNegativeNumber(updates.price, 'Product price');
      changed = true;
    }
    if (updates.stock !== undefined) {
      product.stock = ensureNonNegativeNumber(updates.stock, 'Product stock');
      changed = true;
    }
    if (updates.description !== undefined) {
      product.description = updates.description?.trim() || undefined;
      changed = true;
    }
    if (!changed) {
      throw new DomainError('{E_VALIDATION}', 'No product updates provided');
    }
    product.updatedAt = this.now();
    const event: ProductUpdatedEvent = {
      type: 'product.updated',
      payload: { product: cloneProduct(product), updatedBy: adminId },
    };
    return this.emit(event);
  }

  hideProduct(adminId: string, productId: string): ProductHiddenEvent {
    const product = this.requireProduct(productId);
    this.ensureAdminForTenant(adminId, product.tenantId);
    if (product.status === 'hidden') {
      throw new DomainError('{E_DUPLICATE}', 'Product already hidden');
    }
    product.status = 'hidden';
    product.updatedAt = this.now();
    const event: ProductHiddenEvent = {
      type: 'product.hidden',
      payload: { product: cloneProduct(product), hiddenBy: adminId },
    };
    return this.emit(event);
  }

  getProduct(productId: string): Product | null {
    const product = this.products.get(productId);
    return product ? cloneProduct(product) : null;
  }

  listProducts(tenantId: string): Product[] {
    const ids = this.tenantProducts.get(tenantId);
    if (!ids) return [];
    return Array.from(ids).map((id) => cloneProduct(this.requireProduct(id)));
  }

  addCartItem(userId: string, tenantId: string, productId: string, quantity = 1): void {
    this.ensureUser(userId, 'buyer');
    const product = this.requireProduct(productId);
    if (product.tenantId !== tenantId) {
      throw new DomainError('{E_VALIDATION}', 'Product does not belong to the tenant');
    }
    if (product.status !== 'active') {
      throw new DomainError('{E_VALIDATION}', 'Product is not available for purchase');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DomainError('{E_VALIDATION}', 'Quantity must be a positive integer');
    }
    if (product.stock < quantity) {
      throw new DomainError('{E_VALIDATION}', 'Insufficient stock for product');
    }
    const key = this.cartKey(tenantId, userId);
    const cart = this.carts.get(key) ?? [];
    const existing = cart.find((item) => item.productId === productId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (product.stock < nextQuantity) {
      throw new DomainError('{E_VALIDATION}', 'Insufficient stock for product');
    }
    if (existing) {
      existing.quantity = nextQuantity;
    } else {
      cart.push({ productId, quantity });
    }
    this.carts.set(key, cart);
  }

  getCart(userId: string, tenantId: string): CartItem[] {
    const key = this.cartKey(tenantId, userId);
    const items = this.carts.get(key) ?? [];
    return items.map((item) => ({ ...item }));
  }

  clearCart(userId: string, tenantId: string): void {
    const key = this.cartKey(tenantId, userId);
    this.carts.delete(key);
  }

  checkout(
    userId: string,
    tenantId: string,
    payment: CheckoutPayment = { method: 'card', paid: true },
  ): OrderCreatedEvent {
    this.ensureUser(userId, 'buyer');
    const key = this.cartKey(tenantId, userId);
    const items = this.carts.get(key);
    if (!items || items.length === 0) {
      throw new DomainError('{E_VALIDATION}', 'Cart is empty');
    }
    const timestamp = this.now();
    const resolvedItems: OrderItem[] = items.map((item) => {
      const product = this.requireProduct(item.productId);
      if (product.tenantId !== tenantId) {
        throw new DomainError('{E_VALIDATION}', 'Product does not belong to the store');
      }
      if (product.status !== 'active') {
        throw new DomainError('{E_VALIDATION}', 'Product is not available for purchase');
      }
      if (product.stock < item.quantity) {
        throw new DomainError('{E_VALIDATION}', 'Insufficient stock for product');
      }
      product.stock -= item.quantity;
      product.updatedAt = timestamp;
      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
      };
    });
    const total = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const method = payment.method ?? 'card';
    const paid = payment.paid ?? false;
    const status: OrderStatus = paid ? 'paid' : 'pending';
    const orderId = this.generateId();
    const orderRecord: OrderRecord = {
      id: orderId,
      tenantId,
      userId,
      items: resolvedItems,
      total,
      status,
      payment: {
        method,
        status: paid ? 'paid' : 'pending',
        reference: payment.reference,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.orders.set(orderId, orderRecord);
    const orderIds = this.tenantOrders.get(tenantId) ?? new Set<string>();
    orderIds.add(orderId);
    this.tenantOrders.set(tenantId, orderIds);
    this.carts.delete(key);
    const event: OrderCreatedEvent = {
      type: 'order.created',
      payload: { order: cloneOrder(orderRecord) },
    };
    return this.emit(event);
  }

  getOrder(orderId: string): Order | null {
    const order = this.orders.get(orderId);
    return order ? cloneOrder(order) : null;
  }

  listOrders(tenantId: string): Order[] {
    const ids = this.tenantOrders.get(tenantId);
    if (!ids) return [];
    return Array.from(ids).map((id) => cloneOrder(this.requireOrder(id)));
  }

  private requireOrder(orderId: string): OrderRecord {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new DomainError('{E_VALIDATION}', `Order ${orderId} not found`);
    }
    return order;
  }

  updateOrderStatus(
    adminId: string,
    orderId: string,
    nextStatus: OrderStatus,
  ): OrderStatusChangedEvent {
    const order = this.requireOrder(orderId);
    this.ensureAdminForTenant(adminId, order.tenantId);
    if (order.status === nextStatus) {
      throw new DomainError('{E_DUPLICATE}', 'Order already at requested status');
    }
    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new DomainError(
        '{E_VALIDATION}',
        `Invalid status transition from ${order.status} to ${nextStatus}`,
      );
    }
    const previous = order.status;
    order.status = nextStatus;
    order.updatedAt = this.now();
    const event: OrderStatusChangedEvent = {
      type: 'order.statusChanged',
      payload: {
        orderId: order.id,
        tenantId: order.tenantId,
        from: previous,
        to: nextStatus,
        changedAt: order.updatedAt,
        updatedBy: adminId,
      },
    };
    return this.emit(event);
  }
}

export default StoreDomain;
