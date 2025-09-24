import { randomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';
import type { RecoveryCodeRecord } from '@/agents/admin-agent';
import { getValue, setValue, removeValue } from './nearKvStore';
import { canonicalJson } from '@/utils/serialization';
import uuid from '@/utils/uuid';

const KV_ADDRESS = 'admin-recovery';
const CODE_PREFIX = 'recovery:codes';
const DEFAULT_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_APPROVAL_THRESHOLD = 2;
const CODE_BYTE_LENGTH = 5;

function codeKey(id: string): string {
  return `${CODE_PREFIX}:${id}`;
}

function normalizeRecord(record: RecoveryCodeRecord): RecoveryCodeRecord {
  return {
    ...record,
    approvedBy: Array.from(new Set(record.approvedBy)),
    attempts: record.attempts ?? 0,
  };
}

export interface GenerateRecoveryCodeOptions {
  tenantId: string;
  targetPublicKey: string;
  deviceId: string;
  approvalsRequired?: number;
  ttlMs?: number;
  now?: number;
  code?: string;
  codeId?: string;
}

function randomCode(): string {
  return Buffer.from(randomBytes(CODE_BYTE_LENGTH)).toString('hex');
}

export async function saveRecoveryCode(record: RecoveryCodeRecord): Promise<void> {
  const payload = canonicalJson(normalizeRecord(record));
  await setValue(KV_ADDRESS, codeKey(record.id), payload);
}

export async function getRecoveryCode(codeId: string): Promise<RecoveryCodeRecord | null> {
  const raw = await getValue(KV_ADDRESS, codeKey(codeId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RecoveryCodeRecord;
    return normalizeRecord(parsed);
  } catch {
    return null;
  }
}

export async function removeRecoveryCode(codeId: string): Promise<void> {
  await removeValue(KV_ADDRESS, codeKey(codeId));
}

export async function generateRecoveryCode(
  options: GenerateRecoveryCodeOptions,
): Promise<RecoveryCodeRecord> {
  const now = options.now ?? Date.now();
  const id = options.codeId ?? uuid();
  const code = options.code ?? randomCode();
  const approvalsRequired = Math.max(
    1,
    options.approvalsRequired ?? DEFAULT_APPROVAL_THRESHOLD,
  );
  const expiresAt = now + (options.ttlMs ?? DEFAULT_CODE_TTL_MS);
  const record: RecoveryCodeRecord = {
    id,
    tenantId: options.tenantId,
    targetPublicKey: options.targetPublicKey,
    deviceId: options.deviceId,
    approvalsRequired,
    code,
    createdAt: now,
    expiresAt,
    attempts: 0,
    approvedBy: [],
    status: 'pending',
  };
  await saveRecoveryCode(record);
  return record;
}

