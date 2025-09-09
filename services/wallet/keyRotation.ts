import { connect, keyStores, KeyPair } from 'near-api-js';
import { requireEnv } from '@/services/config';

/**
 * Rotate the access key for an account. Generates a new key pair,
 * adds the new public key on-chain and removes the previous key.
 */
export async function rotateKey(
  accountId: string,
  oldPublicKey: string,
): Promise<KeyPair> {
  const network = requireEnv('EXPO_PUBLIC_NETWORK', 'testnet');
  const nodeUrl =
    network === 'mainnet'
      ? 'https://rpc.mainnet.near.org'
      : 'https://rpc.testnet.near.org';
  const keyStore = new keyStores.InMemoryKeyStore();
  const near = await connect({
    networkId: network,
    nodeUrl,
    deps: { keyStore },
  });
  const account = await near.account(accountId);
  const newKeyPair = KeyPair.fromRandom('ed25519');
  await account.addKey(newKeyPair.publicKey.toString());
  if (oldPublicKey) {
    try {
      await account.deleteKey(oldPublicKey);
    } catch {
      // ignore deletion failures
    }
  }
  await keyStore.setKey(network, accountId, newKeyPair);
  return newKeyPair;
}

export default rotateKey;
