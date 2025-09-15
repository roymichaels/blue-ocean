import type pino from 'pino';
import type { LocalMetricRegistry } from '@/utils/localMetrics';

export type VaultKeyStatus = 'active' | 'pending' | 'retired';

export interface VaultKeyRecord {
  id: string;
  secret: string;
  status: VaultKeyStatus;
  createdAt: string;
  activateAt: string;
  expiresAt: string;
  metadata?: Record<string, string>;
}

export interface VaultKeyRing {
  active: VaultKeyRecord | null;
  pending: VaultKeyRecord | null;
  retired: VaultKeyRecord[];
  updatedAt: string;
}

export interface ZeroTrustAuthContext {
  keyId: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
  metadata?: Record<string, string>;
}

export interface ZeroTrustContext {
  request: Request;
  env?: Record<string, unknown>;
  logger: pino.Logger;
  metrics: LocalMetricRegistry;
  auth: ZeroTrustAuthContext;
}

export type ZeroTrustHandler = (context: ZeroTrustContext) => Promise<Response>;

export interface ZeroTrustFunctionDefinition {
  name: string;
  description?: string;
  handler: ZeroTrustHandler;
}

export interface ZeroTrustRuntime {
  name: string;
  handle: (request: Request, env?: Record<string, unknown>) => Promise<Response>;
}

export interface ZeroTrustAuthorizeOptions {
  clockSkewMs?: number;
  nonceTtlMs?: number;
  gracePeriodMs?: number;
}

export interface RotationTarget {
  functionName: string;
  rotationIntervalMs: number;
  activationLeadTimeMs?: number;
  gracePeriodMs?: number;
  maxRetired?: number;
  metadata?: Record<string, string>;
}

export interface RotationResult {
  functionName: string;
  promotedKeyId?: string;
  generatedKeyId?: string;
  pendingKeyId?: string;
  retiredKeysPruned?: number;
  changed: boolean;
  notes: string[];
}
