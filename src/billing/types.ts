export interface MeteredUsageEvent {
  id: string;
  tenantId: string;
  meterId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  fee: number;
  total: number;
  recordedAt: string;
  walletHash: string;
  metadata?: Record<string, unknown>;
  settledAt?: string | null;
}

export interface RecordUsageInput {
  tenantId: string;
  meterId: string;
  quantity?: number;
  unitPrice?: number;
  walletAddress?: string | null;
  metadata?: Record<string, unknown>;
}

export interface BillingPayment {
  id: string;
  tenantId: string;
  walletHash: string;
  amount: number;
  currency: string;
  usageIds: string[];
  recordedAt: string;
  signature: string;
  note?: string;
}

export interface BillingSummary {
  tenantId: string;
  totalUsage: number;
  totalFees: number;
  outstanding: number;
  updatedAt: string;
  usage: MeteredUsageEvent[];
  payments: BillingPayment[];
  lastPayment: BillingPayment | null;
  walletAlias: string | null;
}

export interface SettleUsageOptions {
  usageIds?: string[];
  amount?: number;
  note?: string;
}
