// TODO:KYC-006 history replay implementation
// TODO:KYC-007 encrypted KV retention (180d) + revoke
// TODO:KYC-020 counters / gauges
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';
import { uuid } from '@/utils/uuid';
import { canonicalJson } from '@/utils/serialization';
import { fetchHistory, publish, subscribeWithAck } from '@/services/waku';
import { getPublicKeyHex } from '@/services/localIdentity';
import { makeSignedWakuMessage } from '@/utils/wakuSigning';
import type { KycReceiptMessage, KycCallReceiptMessage } from '@/types/waku';
import { kycReceiptSchema, kycCallReceiptSchema } from '@/schemas/waku';

const RECEIPT_STORAGE_PREFIX = 'kyc.receipt:';
const CALL_RECEIPT_STORAGE_PREFIX = 'kyc.call.receipt:';
const DM_TOPIC_PREFIX = '/blue-ocean/dm';

function randomNonce(byteLength = 12): string {
  return Buffer.from(randomBytes(byteLength)).toString('hex');
}

function receiptTopic(buyerPublicKey: string): string {
  return `${DM_TOPIC_PREFIX}/${buyerPublicKey}`;
}

export type KycReceipt = KycReceiptMessage;
export type KycCallReceipt = KycCallReceiptMessage;

async function persistReceipt(
  buyerPublicKey: string,
  message: KycReceipt,
): Promise<void> {
  await AsyncStorage.setItem(
    `${RECEIPT_STORAGE_PREFIX}${buyerPublicKey}`,
    canonicalJson(message),
  );
}

export async function loadKycReceipt(buyerPublicKey: string): Promise<KycReceipt | null> {
  if (!buyerPublicKey) return null;
  try {
    const raw = await AsyncStorage.getItem(`${RECEIPT_STORAGE_PREFIX}${buyerPublicKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validated = kycReceiptSchema.parse(parsed);
    return validated;
  } catch {
    return null;
  }
}

export async function issueKycReceipt(
  buyerPublicKey: string,
  data: Record<string, unknown>,
): Promise<KycReceipt> {
  const receiptId = uuid();
  const issuedAt = new Date().toISOString();
  const issuerPublicKey = await getPublicKeyHex();
  const payload = {
    receiptId,
    buyerPublicKey,
    issuerPublicKey,
    issuedAt,
    data,
    ts: Date.now(),
    nonce: randomNonce(),
  };
  const message = await makeSignedWakuMessage('kyc.receipt', payload, 'admin', {
    ts: payload.ts,
    nonce: payload.nonce,
  });
  await persistReceipt(buyerPublicKey, message);
  await publish(receiptTopic(buyerPublicKey), message);
  return message;
}

async function persistCallReceipt(
  buyerPublicKey: string,
  message: KycCallReceipt,
): Promise<void> {
  await AsyncStorage.setItem(
    `${CALL_RECEIPT_STORAGE_PREFIX}${buyerPublicKey}`,
    canonicalJson(message),
  );
}

export async function issueKycCallReceipt(
  buyerPublicKey: string,
  data: Record<string, unknown>,
): Promise<KycCallReceipt> {
  const receiptId = uuid();
  const issuedAt = new Date().toISOString();
  const issuerPublicKey = await getPublicKeyHex();
  const payload = {
    receiptId,
    buyerPublicKey,
    issuerPublicKey,
    issuedAt,
    data,
    ts: Date.now(),
    nonce: randomNonce(),
  };
  const message = await makeSignedWakuMessage('kyc.call.receipt', payload, 'admin', {
    ts: payload.ts,
    nonce: payload.nonce,
  });
  await persistCallReceipt(buyerPublicKey, message);
  await publish(receiptTopic(buyerPublicKey), message);
  return message;
}

export async function loadKycCallReceipt(
  buyerPublicKey: string,
): Promise<KycCallReceipt | null> {
  if (!buyerPublicKey) return null;
  try {
    const raw = await AsyncStorage.getItem(
      `${CALL_RECEIPT_STORAGE_PREFIX}${buyerPublicKey}`,
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validated = kycCallReceiptSchema.parse(parsed);
    return validated;
  } catch {
    return null;
  }
}

export interface KycReceiptSubscriptionOptions {
  onReceipt?: (receipt: KycReceipt) => void | Promise<void>;
  onError?: (error: unknown) => void;
  fetchHistory?: boolean;
}

export async function subscribeToKycReceipts(
  buyerPublicKey: string,
  options: KycReceiptSubscriptionOptions = {},
): Promise<() => void> {
  if (!buyerPublicKey) {
    return () => {};
  }

  const topic = receiptTopic(buyerPublicKey);

  const handleMessage = async (raw: unknown) => {
    const parsed = kycReceiptSchema.safeParse(raw);
    if (!parsed.success) return;
    await persistReceipt(buyerPublicKey, parsed.data);
    try {
      await options.onReceipt?.(parsed.data);
    } catch {}
  };

  if (options.fetchHistory !== false) {
    try {
      await fetchHistory(topic, (msg: unknown) => {
        void handleMessage(msg);
      });
    } catch (err) {
      options.onError?.(err);
    }
  }

  let unsubscribe: (() => void) | undefined;
  try {
    unsubscribe = await subscribeWithAck(topic, (msg: unknown) => {
      void handleMessage(msg);
    });
  } catch (err) {
    options.onError?.(err);
    unsubscribe = undefined;
  }

  return () => {
    try {
      unsubscribe?.();
    } catch {}
  };
}

export async function getReceipt(buyerId: string, tenantId: string): Promise<KycReceipt | null> {
  // TODO:KYC-004 lookup by KV or cache; verify signature freshness
  void buyerId;
  void tenantId;
  return null;
}

export async function putReceipt(receipt: KycReceipt): Promise<void> {
  // TODO:KYC-003 persist encrypted + index by buyerId,tenantId
  void receipt;
}

export async function revokeReceipt(receiptId: string, tenantId: string, reason?: string): Promise<void> {
  // TODO:KYC-019 mark revoked + emit kyc.receipt.revoked
  void receiptId;
  void tenantId;
  void reason;
}
