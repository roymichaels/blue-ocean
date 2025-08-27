import { Account, Near, connect, keyStores } from 'near-api-js';

const DEFAULT_GAS = 150_000_000_000_000n; // 150 Tgas

/**
 * Create a NEAR connection using near-api-js.
 * Defaults to the public testnet configuration.
 */
export async function makeNear(
  networkId = 'testnet',
): Promise<Near> {
  const nodeUrl = networkId === 'mainnet'
    ? 'https://rpc.mainnet.near.org'
    : 'https://rpc.testnet.near.org';
  const walletUrl = networkId === 'mainnet'
    ? 'https://app.mynearwallet.com'
    : 'https://testnet.mynearwallet.com';
  const helperUrl = networkId === 'mainnet'
    ? 'https://helper.mainnet.near.org'
    : 'https://helper.testnet.near.org';

  return connect({
    networkId,
    nodeUrl,
    walletUrl,
    helperUrl,
    deps: { keyStore: new keyStores.InMemoryKeyStore() },
  });
}

interface CallOptions {
  gas?: bigint;
  deposit?: bigint;
}

/**
 * Execute a change method on a contract.
 *
 * @param account NEAR account used to sign the transaction.
 * @param contractId Target contract account id.
 * @param methodName Contract method to call.
 * @param args Arguments to pass to the method.
 * @param options Optional gas and deposit overrides.
 */
export async function callFunction(
  account: Account,
  contractId: string,
  methodName: string,
  args: object = {},
  options: CallOptions = {},
) {
  const { gas = DEFAULT_GAS, deposit = 0n } = options;
  return account.functionCall({
    contractId,
    methodName,
    args,
    gas,
    attachedDeposit: deposit,
  });
}

/**
 * Execute a view method on a contract without requiring a wallet.
 *
 * @param near Active Near connection.
 * @param contractId Target contract account id.
 * @param methodName Contract view method to call.
 * @param args Arguments to pass to the method.
 */
export async function viewFunction(
  near: Near,
  contractId: string,
  methodName: string,
  args: object = {},
) {
  const account = await near.account('dontcare');
  return account.viewFunction({ contractId, methodName, args });
}
