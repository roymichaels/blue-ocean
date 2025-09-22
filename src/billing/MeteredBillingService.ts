import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256 } from '@noble/hashes/sha256';
import { chainAdapter } from '@/services/chain';
import eventBus from '@/services/eventBus';
import { getFeeSettings } from '@/constants/tenant';
import { canonicalJson } from '@/utils/serialization';
import ensureNearWallet from '@/utils/ensureNearWallet';
import { uuid } from '@/utils/uuid';
import { errorLog } from '@/utils/logger';
import type {
  BillingPayment,
  BillingSummary,
  MeteredUsageEvent,
  RecordUsageInput,
  SettleUsageOptions,
} from './types';

const BILLING_TOPIC = '/blue-ocean/billing/1';
const STORAGE_USAGE_PREFIX = 'billing:usage:';
const STORAGE_PAYMENT_PREFIX = 'billing:payments:';

function round(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toUtf8(value: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value);
  }
  const arr = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    arr[i] = value.charCodeAt(i);
  }
  return arr;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function pseudonymizeWallet(address: string, tenantId: string): string {
  const normalizedAddress = address.trim().toLowerCase();
  const normalizedTenant = tenantId.trim().toLowerCase();
  const input = `${normalizedTenant}:${normalizedAddress}`;
  const hash = sha256(toUtf8(input));
  return toHex(hash);
}

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  try {
    return JSON.parse(JSON.stringify(metadata));
  } catch {
    return undefined;
  }
}

function cloneUsage(events: MeteredUsageEvent[]): MeteredUsageEvent[] {
  return events.map((event) => ({ ...event, metadata: sanitizeMetadata(event.metadata) }));
}

function clonePayments(payments: BillingPayment[]): BillingPayment[] {
  return payments.map((payment) => ({ ...payment, usageIds: [...payment.usageIds] }));
}

export default class MeteredBillingService {
  private static instance: MeteredBillingService | null = null;

  private usageCache: Map<string, MeteredUsageEvent[]> = new Map();

  private paymentCache: Map<string, BillingPayment[]> = new Map();

  private listeners: Map<string, Set<() => void>> = new Map();

  static getInstance(): MeteredBillingService {
    if (!MeteredBillingService.instance) {
      MeteredBillingService.instance = new MeteredBillingService();
    }
    return MeteredBillingService.instance;
  }

  private constructor() {}

  private getUsageKey(tenantId: string): string {
    return `${STORAGE_USAGE_PREFIX}${tenantId}`;
  }

  private getPaymentKey(tenantId: string): string {
    return `${STORAGE_PAYMENT_PREFIX}${tenantId}`;
  }

  private async loadUsage(tenantId: string): Promise<MeteredUsageEvent[]> {
    if (this.usageCache.has(tenantId)) {
      return this.usageCache.get(tenantId) as MeteredUsageEvent[];
    }
    try {
      const raw = await AsyncStorage.getItem(this.getUsageKey(tenantId));
      if (!raw) {
        this.usageCache.set(tenantId, []);
        return [];
      }
      const parsed = JSON.parse(raw) as MeteredUsageEvent[];
      this.usageCache.set(tenantId, parsed);
      return parsed;
    } catch (err) {
      errorLog('Failed to load metered usage', err);
      this.usageCache.set(tenantId, []);
      return [];
    }
  }

  private async loadPayments(tenantId: string): Promise<BillingPayment[]> {
    if (this.paymentCache.has(tenantId)) {
      return this.paymentCache.get(tenantId) as BillingPayment[];
    }
    try {
      const raw = await AsyncStorage.getItem(this.getPaymentKey(tenantId));
      if (!raw) {
        this.paymentCache.set(tenantId, []);
        return [];
      }
      const parsed = JSON.parse(raw) as BillingPayment[];
      this.paymentCache.set(tenantId, parsed);
      return parsed;
    } catch (err) {
      errorLog('Failed to load billing payments', err);
      this.paymentCache.set(tenantId, []);
      return [];
    }
  }

  private async persistUsage(tenantId: string, events: MeteredUsageEvent[]): Promise<void> {
    const sorted = [...events].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
    this.usageCache.set(tenantId, sorted);
    try {
      await AsyncStorage.setItem(this.getUsageKey(tenantId), JSON.stringify(sorted));
    } catch (err) {
      errorLog('Failed to persist metered usage', err);
    }
  }

  private async persistPayments(tenantId: string, payments: BillingPayment[]): Promise<void> {
    const sorted = [...payments].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
    this.paymentCache.set(tenantId, sorted);
    try {
      await AsyncStorage.setItem(this.getPaymentKey(tenantId), JSON.stringify(sorted));
    } catch (err) {
      errorLog('Failed to persist billing payments', err);
    }
  }

  private notify(tenantId: string): void {
    const listeners = this.listeners.get(tenantId);
    if (!listeners) return;
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        errorLog('MeteredBilling listener error', err);
      }
    });
  }

  subscribe(tenantId: string, callback: () => void): () => void {
    if (!this.listeners.has(tenantId)) {
      this.listeners.set(tenantId, new Set());
    }
    const set = this.listeners.get(tenantId) as Set<() => void>;
    set.add(callback);
    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(tenantId);
      }
    };
  }

  async recordUsage(input: RecordUsageInput): Promise<MeteredUsageEvent> {
    const tenantId = input.tenantId?.trim();
    if (!tenantId) {
      throw new Error('Tenant identifier required for billing usage');
    }
    const meterId = input.meterId?.trim();
    if (!meterId) {
      throw new Error('Meter identifier required for billing usage');
    }
    const quantity = Number.isFinite(input.quantity) ? Number(input.quantity) : 1;
    const unitPrice = Number.isFinite(input.unitPrice) ? Number(input.unitPrice) : 0;
    const safeQuantity = quantity > 0 ? quantity : 0;
    const safeUnitPrice = unitPrice >= 0 ? unitPrice : 0;
    const subtotal = round(safeQuantity * safeUnitPrice);
    const { feeBps } = await getFeeSettings();
    const fee = round((subtotal * (feeBps ?? 0)) / 10000);
    const total = round(subtotal + fee);
    const walletHash = input.walletAddress
      ? pseudonymizeWallet(input.walletAddress, tenantId)
      : 'anonymous';
    const usage: MeteredUsageEvent = {
      id: uuid(),
      tenantId,
      meterId,
      quantity: safeQuantity,
      unitPrice: safeUnitPrice,
      subtotal,
      fee,
      total,
      recordedAt: new Date().toISOString(),
      walletHash,
      metadata: sanitizeMetadata(input.metadata),
      settledAt: null,
    };

    const existing = await this.loadUsage(tenantId);
    await this.persistUsage(tenantId, [usage, ...existing]);

    await eventBus.publish(BILLING_TOPIC, 'billing.usage', {
      tenantId,
      meterId,
      eventId: usage.id,
      quantity: safeQuantity,
      subtotal,
      fee,
      walletHash,
    });

    this.notify(tenantId);
    return usage;
  }

  async listUsageEvents(tenantId: string): Promise<MeteredUsageEvent[]> {
    const usage = await this.loadUsage(tenantId);
    return cloneUsage(usage);
  }

  async listPayments(tenantId: string): Promise<BillingPayment[]> {
    const payments = await this.loadPayments(tenantId);
    return clonePayments(payments);
  }

  async getSummary(tenantId: string): Promise<BillingSummary> {
    const usage = await this.loadUsage(tenantId);
    const payments = await this.loadPayments(tenantId);
    const totalUsage = round(usage.reduce((sum, event) => sum + event.subtotal, 0));
    const totalFees = round(usage.reduce((sum, event) => sum + event.fee, 0));
    const outstanding = round(
      usage.filter((event) => !event.settledAt).reduce((sum, event) => sum + event.fee, 0),
    );
    const lastPayment = payments[0] ?? null;
    const walletAlias = lastPayment?.walletHash || usage[0]?.walletHash || null;

    return {
      tenantId,
      totalUsage,
      totalFees,
      outstanding,
      updatedAt: new Date().toISOString(),
      usage: cloneUsage(usage),
      payments: clonePayments(payments),
      lastPayment,
      walletAlias,
    };
  }

  async settleUsage(tenantId: string, options: SettleUsageOptions = {}): Promise<BillingPayment> {
    const id = tenantId?.trim();
    if (!id) {
      throw new Error('Tenant identifier required to settle usage');
    }
    const usage = await this.loadUsage(id);
    const unsettled = usage.filter((event) => !event.settledAt);
    if (unsettled.length === 0) {
      throw new Error('No outstanding usage to settle');
    }
    const selectedIds = options.usageIds?.length
      ? options.usageIds.filter((usageId) => unsettled.some((event) => event.id === usageId))
      : unsettled.map((event) => event.id);
    const selectedEvents = unsettled.filter((event) => selectedIds.includes(event.id));
    if (selectedEvents.length === 0) {
      throw new Error('Selected usage events are already settled');
    }
    const calculatedAmount = round(selectedEvents.reduce((sum, event) => sum + event.fee, 0));
    const amount = Number.isFinite(options.amount) && (options.amount ?? 0) > 0
      ? round(options.amount as number)
      : calculatedAmount;
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const { address } = await ensureNearWallet('Connect wallet to settle network fees.');
    if (!chainAdapter.signMessage) {
      throw new Error('Wallet does not support private billing settlements');
    }
    const walletHash = pseudonymizeWallet(address, id);
    const paymentId = uuid();
    const recordedAt = new Date().toISOString();
    const payload = {
      type: 'billing.payment',
      paymentId,
      tenantId: id,
      walletHash,
      amount: amount.toFixed(6),
      usageIds: selectedIds,
      timestamp: recordedAt,
      note: options.note ?? undefined,
    };
    const signature = await chainAdapter.signMessage(canonicalJson(payload));

    const payment: BillingPayment = {
      id: paymentId,
      tenantId: id,
      walletHash,
      amount,
      currency: 'NEAR',
      usageIds: selectedIds,
      recordedAt,
      signature,
      note: options.note,
    };

    const payments = await this.loadPayments(id);
    await this.persistPayments(id, [payment, ...payments]);

    const updatedUsage = usage.map((event) =>
      selectedIds.includes(event.id) ? { ...event, settledAt: recordedAt } : event,
    );
    await this.persistUsage(id, updatedUsage);

    await eventBus.publish(BILLING_TOPIC, 'billing.payment', {
      tenantId: id,
      paymentId,
      amount,
      usageIds: selectedIds,
      walletHash,
    });

    this.notify(id);
    return payment;
  }
}
