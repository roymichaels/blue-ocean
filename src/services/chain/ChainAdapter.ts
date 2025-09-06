import type { Order } from '@/types';

export interface ChainAdapter {
  /** Initialize wallet or chain connection */
  init(): Promise<{ selector?: any; error?: Error | null }>;
  /** Open a wallet connection modal */
  openModal(): Promise<void>;
  /** React hook returning the current account identifier */
  useAccount(): string | null;
  /** React hook returning the current account identifier */
  useAccountId(): string | null;
  /** Synchronously get the current account identifier */
  getAccountId(): string | null;
  /** Return underlying wallet selector or provider */
  getSelector(): any;
  /** Fetch the balance for the given account in smallest unit */
  getBalance(address: string): Promise<string>;
  /** Sign an arbitrary message */
  signMessage?(message: Uint8Array | string): Promise<string>;
  /** List orders for a given seller */
  listOrdersBySeller?(storeId: string, sellerId: string): Promise<Order[]>;
  /** Optional chain specific payment helper */
  payPrivately?(args: any): Promise<any>;
}

export default ChainAdapter;
