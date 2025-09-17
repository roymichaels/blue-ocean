import { makeSignedWakuMessage } from '@/utils/wakuSigning';
import { publish as publishWaku } from '@/services/waku';
import { adminUsersTopic } from '@/utils/wakuTopics';
import type { WakuMessage } from '@/types/waku';
import { randomBytes } from '@noble/hashes/utils';

export interface RecoveryIntent {
  tenantId: string;
  codeId: string;
  code: string;
  deviceId: string;
  targetPublicKey?: string;
  approvalsRequired?: number;
}

const DEFAULT_TENANT = '1';
const SUPPORTED_HOST = 'admin-recovery';

function normalizeIntent(data: Record<string, unknown>): RecoveryIntent | null {
  const tenantRaw = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';
  const tenantId = tenantRaw.length > 0 ? tenantRaw : DEFAULT_TENANT;
  const codeId = typeof data.codeId === 'string' ? data.codeId.trim() : '';
  const code = typeof data.code === 'string' ? data.code.trim() : '';
  const deviceId = typeof data.deviceId === 'string' ? data.deviceId.trim() : '';
  if (!codeId || !code || !deviceId) {
    return null;
  }
  const intent: RecoveryIntent = { tenantId, codeId, code, deviceId };
  if (typeof data.targetPublicKey === 'string') {
    const pk = data.targetPublicKey.trim();
    if (pk) intent.targetPublicKey = pk;
  }
  if (typeof data.approvalsRequired === 'number' && Number.isFinite(data.approvalsRequired)) {
    const value = Math.max(1, Math.floor(data.approvalsRequired));
    intent.approvalsRequired = value;
  } else if (typeof data.approvalsRequired === 'string') {
    const parsed = Number.parseInt(data.approvalsRequired, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      intent.approvalsRequired = parsed;
    }
  }
  return intent;
}

function paramsToIntent(params: URLSearchParams): RecoveryIntent | null {
  const raw: Record<string, string> = {};
  params.forEach((value, key) => {
    raw[key] = value;
  });
  return normalizeIntent(raw);
}

export function parseRecoveryDeeplink(source: string | null | undefined): RecoveryIntent | null {
  if (!source) return null;
  const trimmed = source.trim();
  if (!trimmed) return null;
  try {
    const asJson = JSON.parse(trimmed);
    if (asJson && typeof asJson === 'object' && !Array.isArray(asJson)) {
      return normalizeIntent(asJson as Record<string, unknown>);
    }
  } catch {
    // ignore JSON parse errors and fall back to URL parsing
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'blueocean:' && url.hostname === SUPPORTED_HOST) {
      return paramsToIntent(url.searchParams);
    }
    if (url.pathname.replace(/^\//, '') === SUPPORTED_HOST) {
      return paramsToIntent(url.searchParams);
    }
  } catch {
    // Not a URL; fall back to query string parsing
  }
  try {
    const params = new URLSearchParams(trimmed.startsWith('?') ? trimmed : `?${trimmed}`);
    return paramsToIntent(params);
  } catch {
    return null;
  }
}

export interface SubmitRecoveryOptions {
  role?: string;
  topic?: string;
  publish?: typeof publishWaku;
  ts?: number;
}

export async function submitRecoveryRequest(
  intent: RecoveryIntent,
  options: SubmitRecoveryOptions = {},
): Promise<WakuMessage<RecoveryIntent & { nonce: string; ts: number }>> {
  const ts = options.ts ?? Date.now();
  const nonce = Array.from(randomBytes(12))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const payload: RecoveryIntent & { nonce: string; ts: number } = {
    ...intent,
    tenantId: intent.tenantId || DEFAULT_TENANT,
    nonce,
    ts,
  };
  const message = await makeSignedWakuMessage(
    'admin.recovery.request',
    payload,
    options.role ?? 'user',
    { ts, nonce },
  );
  const publishFn = options.publish ?? publishWaku;
  const topic = options.topic ?? adminUsersTopic(intent.tenantId);
  await publishFn(topic, message);
  return message;
}

