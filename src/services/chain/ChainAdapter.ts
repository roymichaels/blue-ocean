export interface ChainAdapter {
  /** Initialize wallet or chain connection */
  init(): Promise<{ selector?: any; error?: Error | null }>;
  /** Open a wallet connection modal */
  openModal(): Promise<void>;
  /** React hook returning the current account identifier */
  useAccount(): string | null;
  /** Return underlying wallet selector or provider */
  getSelector(): any;
  /** Fetch the balance for the given account in smallest unit */
  getBalance(address: string): Promise<string>;
  /** Optional chain specific payment helper */
  payPrivately?(args: any): Promise<any>;
}

export default ChainAdapter;
