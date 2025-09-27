// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { ChainAdapter } from './ChainAdapter';
import { notImplemented } from '@/services/nearStub';

export const nearAdapter: ChainAdapter = {
  async init() {
    return notImplemented('nearAdapter.init');
  },
  async openModal() {
    return notImplemented('nearAdapter.openModal');
  },
  useAccount() {
    return notImplemented('nearAdapter.useAccount');
  },
  useAccountId() {
    return notImplemented('nearAdapter.useAccountId');
  },
  getAccountId() {
    return notImplemented('nearAdapter.getAccountId');
  },
  getPublicKey() {
    return notImplemented('nearAdapter.getPublicKey');
  },
  getSelector() {
    return notImplemented('nearAdapter.getSelector');
  },
  async getBalance() {
    return notImplemented('nearAdapter.getBalance');
  },
  async signMessage() {
    return notImplemented('nearAdapter.signMessage');
  },
  async listOrdersBySeller() {
    return notImplemented('nearAdapter.listOrdersBySeller');
  },
  async listOrdersByBuyer() {
    return notImplemented('nearAdapter.listOrdersByBuyer');
  },
  async payPrivately() {
    return notImplemented('nearAdapter.payPrivately');
  },
};

export default nearAdapter;
