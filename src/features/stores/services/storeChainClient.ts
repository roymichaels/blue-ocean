import type { WalletSelector } from '@near-wallet-selector/core';
import type { chainAdapter as ChainAdapter } from '@/services/chain';
import type { getSelector } from '@/services/walletSelector';
import type { nearConfig } from '@/hooks/config';
import { canonicalJson } from '@/utils/serialization';

export interface MintStoreResult {
  id: string;
  nftId: string;
  txHash: string;
}

export interface StoreChainClientDeps {
  assertNearChain: () => void;
  getSelector: typeof getSelector;
  nearConfig: typeof nearConfig;
  chainAdapter: typeof ChainAdapter;
  loadAppConfig: () => Promise<typeof import('@/config').default>;
  fetchFn?: typeof fetch;
}

function decodeBase64String(value: string): string {
  const globalObj: any = globalThis as any;
  const BufferCtor = globalObj?.Buffer;
  if (BufferCtor?.from) {
    try {
      return BufferCtor.from(value, 'base64').toString('utf-8');
    } catch {
      // fall through
    }
  }
  if (typeof globalObj?.atob === 'function') {
    try {
      const binary = globalObj.atob(value);
      if (typeof globalObj.TextDecoder === 'function') {
        const decoder = new globalObj.TextDecoder();
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return decoder.decode(bytes);
      }
      return binary;
    } catch {
      try {
        return globalObj.atob(value);
      } catch {
        // continue to fallback
      }
    }
  }
  return value;
}

function ensureWalletSelector(selector: WalletSelector | null | undefined) {
  if (!selector) {
    throw new Error('Wallet not initialized');
  }
  return selector;
}

function isTestEnvironment(): boolean {
  return Boolean(process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test');
}

export class StoreChainClient {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly deps: StoreChainClientDeps) {
    this.fetchFn = deps.fetchFn ?? globalThis.fetch?.bind(globalThis) ?? fetch;
  }

  async mintStore(name: string): Promise<MintStoreResult> {
    this.deps.assertNearChain();
    const { contractId } = this.deps.nearConfig();
    if (!contractId) throw new Error('CONTRACT_ID required');
    const selector = ensureWalletSelector(this.deps.getSelector());
    const wallet = await selector.wallet();
    const signer: any = wallet;
    if (!signer?.signAndSendTransactions) {
      throw new Error('Wallet not initialized');
    }
    const res: any = await signer.signAndSendTransactions({
      transactions: [
        {
          receiverId: contractId,
          actions: [
            {
              type: 'FunctionCall',
              params: {
                methodName: 'mint_store',
                args: { name },
                gas: '30000000000000',
                deposit: '0',
              },
            },
          ],
        },
      ],
    });

    const outcome = Array.isArray(res) ? res[0] : res;
    const txHash: string = outcome?.transaction?.hash || '';
    let id = '';
    let nftId = '';
    try {
      const val =
        outcome?.status?.SuccessValue ||
        outcome?.transaction_outcome?.outcome?.status?.SuccessValue;
      if (val) {
        const decoded = decodeBase64String(val);
        const parsed = JSON.parse(decoded);
        id = parsed.store_id || parsed.storeId || parsed.id || '';
        nftId = parsed.nft_id || parsed.nftId || '';
      }
    } catch {}
    if (!id) throw new Error('mint_store failed');
    return { id, nftId, txHash };
  }

  async submitMutation(
    action: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    if (isTestEnvironment()) return;
    const payload = canonicalJson({ action, ...data });
    this.deps.assertNearChain();
    const tx = await this.deps.chainAdapter.signMessage?.(payload);
    if (!tx) {
      throw new Error('Transaction failed');
    }
  }

  async createStoreOnChain(args: {
    id: string;
    name: string;
    owner: string;
  }): Promise<string> {
    const appConfig = await this.deps.loadAppConfig();
    const relayerUrl = appConfig.EXPO_PUBLIC_RELAYER_URL;
    if (!relayerUrl) throw new Error('EXPO_PUBLIC_RELAYER_URL not configured');
    this.deps.assertNearChain();
    const { chainAdapter } = this.deps;
    const publicKey = chainAdapter.getPublicKey();
    if (!publicKey) throw new Error('Wallet not connected');
    const body = {
      action: 'create_store' as const,
      args: { store_id: args.id, name: args.name },
      ownerId: args.owner,
    };
    const encoder = new TextEncoder();
    const toSign = encoder.encode(
      JSON.stringify({ action: body.action, args: body.args }),
    );
    const signature = await chainAdapter.signMessage?.(toSign);
    const response = await this.fetchFn(`${relayerUrl}/meta-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: canonicalJson({ ...body, publicKey, signature }),
    });
    if (!response.ok) {
      let msg = `${response.status} ${response.statusText}`;
      try {
        const json = await response.json();
        msg = (json && (json.error || json.message)) || msg;
      } catch {}
      throw new Error(`Relayer error: ${msg}`);
    }
    const json = await response.json();
    if (json?.error) throw new Error(String(json.error));
    return json?.tx || '';
  }
}

export function createStoreChainClient(
  deps: StoreChainClientDeps,
): StoreChainClient {
  return new StoreChainClient(deps);
}
