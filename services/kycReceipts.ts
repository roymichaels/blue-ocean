import AsyncStorage from '@react-native-async-storage/async-storage';
import { sign } from '@noble/ed25519';
import { uuid } from '@/utils/uuid';
import { canonicalJson } from '@/utils/serialization';
import { publish } from '@/services/waku';
import { getPrivateKey, getPublicKeyHex } from '@/services/localIdentity';

const RECEIPT_STORAGE_PREFIX = 'kyc.receipt:';
const NOTIFICATIONS_TOPIC = '/blue-ocean/notifications/1';

export interface KycReceipt {
  id: string;
  buyerPublicKey: string;
  issuerPublicKey: string;
  issuedAt: string;
  signature: string;
  payload: Record<string, unknown>;
}

export async function loadKycReceipt(buyerPublicKey: string): Promise<KycReceipt | null> {
  if (!buyerPublicKey) return null;
  try {
    const raw = await AsyncStorage.getItem(`${RECEIPT_STORAGE_PREFIX}${buyerPublicKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KycReceipt;
    return parsed;
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
  const payload = {
    receiptId,
    buyerPublicKey,
    issuedAt,
    ...data,
  };
  const [priv, issuerPublicKey] = await Promise.all([
    getPrivateKey(),
    getPublicKeyHex(),
  ]);
  const sender = { publicKey: issuerPublicKey, role: 'admin' as const };
  const bytes = new TextEncoder().encode(
    canonicalJson({ type: 'kyc.receipt', payload, sender }),
  );
  const signature = await sign(bytes, priv);
  const message = {
    id: receiptId,
    type: 'kyc.receipt',
    payload,
    sender,
    signature: Buffer.from(signature).toString('hex'),
  };
  await AsyncStorage.setItem(
    `${RECEIPT_STORAGE_PREFIX}${buyerPublicKey}`,
    canonicalJson({
      id: receiptId,
      buyerPublicKey,
      issuerPublicKey,
      issuedAt,
      signature: message.signature,
      payload,
    }),
  );
  await publish(NOTIFICATIONS_TOPIC, message);
  return {
    id: receiptId,
    buyerPublicKey,
    issuerPublicKey,
    issuedAt,
    signature: message.signature,
    payload,
  };
}
