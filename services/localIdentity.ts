import * as SecureStore from 'expo-secure-store';
import { getPublicKey, utils } from '@noble/ed25519';

const KEY_NAME = 'ephemeral-ed25519-private-key';
let memoryKey: string | null = null;

async function getPrivateKeyHex(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(KEY_NAME);
    if (stored) return stored;
  } catch {
    if (memoryKey) return memoryKey;
  }
  const privBytes = utils.randomPrivateKey();
  const hex = Buffer.from(privBytes).toString('hex');
  try {
    await SecureStore.setItemAsync(KEY_NAME, hex);
  } catch {
    memoryKey = hex;
  }
  return hex;
}

export async function getEd25519KeyPair(): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}> {
  const hex = await getPrivateKeyHex();
  const privBytes = Buffer.from(hex, 'hex');
  const pubBytes = await getPublicKey(privBytes);
  return { privateKey: privBytes, publicKey: pubBytes };
}

export async function getPublicKeyHex(): Promise<string> {
  const { publicKey } = await getEd25519KeyPair();
  return Buffer.from(publicKey).toString('hex');
}

export async function getPrivateKey(): Promise<Uint8Array> {
  const { privateKey } = await getEd25519KeyPair();
  return privateKey;
}
