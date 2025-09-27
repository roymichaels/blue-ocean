// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import { notImplemented } from '@/services/nearStub';

export const selector = null;

export async function init(): Promise<never> {
  return notImplemented('walletSelector.init');
}

export async function signIn(): Promise<never> {
  return notImplemented('walletSelector.signIn');
}

export async function signOut(): Promise<never> {
  return notImplemented('walletSelector.signOut');
}

export async function signMessage(_message: Uint8Array | string): Promise<string> {
  return notImplemented('walletSelector.signMessage');
}

export async function getHealthyRpcUrl(_urls: string[]): Promise<string> {
  return notImplemented('walletSelector.getHealthyRpcUrl');
}

export function useAccount(): string | null {
  return notImplemented('walletSelector.useAccount');
}

export const useAccountId = useAccount;

export function getAccountId(): string | null {
  return notImplemented('walletSelector.getAccountId');
}

export function getPublicKey(): string | null {
  return notImplemented('walletSelector.getPublicKey');
}

export function getSelector(): never {
  return notImplemented('walletSelector.getSelector');
}

const walletSelector = {
  init,
  signIn,
  signOut,
  signMessage,
  useAccount,
  useAccountId,
  getAccountId,
  getPublicKey,
  getSelector,
};

export default walletSelector;
