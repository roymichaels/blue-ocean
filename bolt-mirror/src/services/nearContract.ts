// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import { notImplemented } from '@/services/nearStub';

export const ESCROW_ERROR_CODES = {
  scopeMissing: 'ERR_SCOPE_MISSING',
  kycRequired: 'ERR_KYC_REQUIRED',
  duplicateNonce: 'ERR_DUPLICATE_NONCE',
  deploymentFailed: 'ERR_ESCROW_DEPLOY',
} as const;

export type EscrowErrorCode = (typeof ESCROW_ERROR_CODES)[keyof typeof ESCROW_ERROR_CODES];

export interface DeployEscrowDraft {
  sessionToken?: string;
  scopes?: string[];
  nonce: string;
  total: number;
  feeAddress: string;
  feeBps: number;
  buyerAddress?: string;
  sellerAddress?: string;
  kycReceiptHash?: string;
}

export interface DeployEscrowResult {
  contractAddress: string;
  txHash: string;
  expiresAt: string;
  status: 'pending';
}

export const ORDER_PAYMENT_FACTORY_ADDRESS = '';

export async function getOrderPaymentFactoryAddress(): Promise<string> {
  return notImplemented('getOrderPaymentFactoryAddress');
}

export async function deployEscrow(_draft: DeployEscrowDraft): Promise<DeployEscrowResult> {
  return notImplemented('deployEscrow');
}

export async function releasePayment(_contractAddress: string): Promise<string> {
  return notImplemented('releasePayment');
}

export async function refundPayment(_contractAddress: string): Promise<string> {
  return notImplemented('refundPayment');
}

export async function adminResolve(
  _contractAddress: string,
  _toSeller: boolean,
): Promise<string> {
  return notImplemented('adminResolve');
}
