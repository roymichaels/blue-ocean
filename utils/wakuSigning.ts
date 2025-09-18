import { canonicalJson } from '@/utils/serialization';
import { getPrivateKey, getPublicKeyHex } from '@/services/localIdentity';
import type { WakuMessage } from '@/types/waku';
import { sign } from '@noble/ed25519';
import { randomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';

const NONCE_BYTE_LENGTH = 12;

function randomNonce(byteLength = NONCE_BYTE_LENGTH): string {
  return Buffer.from(randomBytes(byteLength)).toString('hex');
}

const textEncoder = new TextEncoder();

export async function makeSignedWakuMessage<TPayload, TType extends string>(
  type: TType,
  payload: TPayload,
  role: string,
  options: { ts?: number; nonce?: string } = {},
): Promise<WakuMessage<TPayload> & { type: TType }> {
  const priv = await getPrivateKey();
  const pub = await getPublicKeyHex();
  const ts = options.ts ?? Date.now();
  const nonce = options.nonce ?? randomNonce();
  const message: WakuMessage<TPayload> & { type: TType } = {
    type,
    payload,
    sender: { publicKey: pub, role },
    signature: '',
    ts,
    nonce,
  };
  const toSign = textEncoder.encode(
    canonicalJson({ type: message.type, payload: message.payload, sender: message.sender }),
  );
  const sig = await sign(toSign, priv);
  message.signature = Buffer.from(sig).toString('hex');
  return message;
}
