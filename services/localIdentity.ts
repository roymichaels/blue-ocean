import { Buffer } from 'buffer';
import * as SecureStore from 'expo-secure-store';
import { getPublicKey, utils } from '@noble/ed25519';

const KEY_NAME = 'ephemeral-ed25519';
let memoryKey: string | null = null;

async function getPrivateKeyHex(): Promise<string> {\r\n  try {\r\n    const stored = await SecureStore.getItemAsync(KEY_NAME);\r\n    if (stored) {\r\n      memoryKey = stored;\r\n      return stored;\r\n    }\r\n  } catch {\r\n    if (memoryKey) return memoryKey;\r\n  }\r\n  if (memoryKey) return memoryKey;\r\n  const privBytes = utils.randomPrivateKey();\r\n  const hex = Buffer.from(privBytes).toString('hex');\r\n  memoryKey = hex;\r\n  try {\r\n    await SecureStore.setItemAsync(KEY_NAME, hex);\r\n  } catch {\r\n    // fall back to in-memory key when SecureStore unavailable\r\n  }\r\n  return hex;\r\n}

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

