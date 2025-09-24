import { connect, keyStores, KeyPair } from 'near-api-js';
import { getNetworkId } from '@/hooks/config';

/**
 * Rotate the access key for an account. Generates a new key pair,
 * adds the new public key on-chain and removes the previous key.
 */
export async function rotateKey(
  accountId: string,
  oldPublicKey: string,
): Promise<KeyPair> {
  const network = getNetworkId() || 'testnet';
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
  await account.addKey(newKeyPair.getPublicKey().toString());
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
