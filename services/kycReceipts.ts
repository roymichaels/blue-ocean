import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';
import { uuid } from '@/utils/uuid';
import { canonicalJson } from '@/utils/serialization';
import { fetchHistory, publish, subscribeWithAck } from '@/services/waku';
import { getPublicKeyHex } from '@/services/localIdentity';
import { makeSignedWakuMessage } from '@/utils/wakuSigning';
import type { KycReceiptMessage } from '@/types/waku';
import { kycReceiptSchema } from '@/schemas/waku';

const RECEIPT_STORAGE_PREFIX = 'kyc.receipt:';
const DM_TOPIC_PREFIX = '/blue-ocean/dm';

function randomNonce(byteLength = 12): string {
  return Buffer.from(randomBytes(byteLength)).toString('hex');
}

function receiptTopic(buyerPublicKey: string): string {
  return `${DM_TOPIC_PREFIX}/${buyerPublicKey}`;
}

export type KycReceipt = KycReceiptMessage;

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
