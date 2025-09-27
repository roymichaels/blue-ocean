// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import { notImplemented } from '@/services/nearStub';

const chain = 'bolt';

export const chainAdapter = {
  async init(): Promise<never> {
    return notImplemented('chainAdapter.init');
  },
  async openModal(): Promise<never> {
    return notImplemented('chainAdapter.openModal');
  },
  useAccount(): string | null {
    return notImplemented('chainAdapter.useAccount');
  },
  useAccountId(): string | null {
    return notImplemented('chainAdapter.useAccountId');
  },
  getAccountId(): string | null {
    return notImplemented('chainAdapter.getAccountId');
  },
  getPublicKey(): string | null {
    return notImplemented('chainAdapter.getPublicKey');
  },
  getSelector(): never {
    return notImplemented('chainAdapter.getSelector');
  },
  async getBalance(): Promise<string> {
    return notImplemented('chainAdapter.getBalance');
  },
  async signMessage(): Promise<string> {
    return notImplemented('chainAdapter.signMessage');
  },
  async listOrdersBySeller(): Promise<never> {
    return notImplemented('chainAdapter.listOrdersBySeller');
  },
  async listOrdersByBuyer(): Promise<never> {
    return notImplemented('chainAdapter.listOrdersByBuyer');
  },
  async payPrivately(): Promise<never> {
    return notImplemented('chainAdapter.payPrivately');
  },
};

export function assertNearChain(): never {
  return notImplemented('assertNearChain');
}

export default chain;
