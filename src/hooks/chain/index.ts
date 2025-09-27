// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { ChainAdapter } from './ChainAdapter';
import { assertNearChain } from './assert';
import { notImplemented } from '@/services/nearStub';

export const chainAdapter: ChainAdapter = {
  async init() {
    return notImplemented('chainAdapter.init');
  },
  async openModal() {
    return notImplemented('chainAdapter.openModal');
  },
  useAccount() {
    return notImplemented('chainAdapter.useAccount');
  },
  useAccountId() {
    return notImplemented('chainAdapter.useAccountId');
  },
  getAccountId() {
    return notImplemented('chainAdapter.getAccountId');
  },
  getPublicKey() {
    return notImplemented('chainAdapter.getPublicKey');
  },
  getSelector() {
    return notImplemented('chainAdapter.getSelector');
  },
  async getBalance() {
    return notImplemented('chainAdapter.getBalance');
  },
  async signMessage() {
    return notImplemented('chainAdapter.signMessage');
  },
  async listOrdersBySeller() {
    return notImplemented('chainAdapter.listOrdersBySeller');
  },
  async listOrdersByBuyer() {
    return notImplemented('chainAdapter.listOrdersByBuyer');
  },
  async payPrivately() {
    return notImplemented('chainAdapter.payPrivately');
  },
};

export { assertNearChain };

const CHAIN = 'bolt' as const;

export default CHAIN;
