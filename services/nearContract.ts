import { errorLog } from '@/utils/logger';
import { chainAdapter } from '@/services/chain';
import { fetchSettings } from './nearSettings';
import { assertNearChain } from './chain';
import config from '@/config';
import { retryWithBackoff } from '@/utils/retry';
import {
  logger,
  serviceLatency,
  serviceFailures,
  adminTransactionIntegrity,
} from '@/utils/observability';
import isAdmin from '@/utils/isAdmin';
import { CHECKOUT_SCOPE, getSession } from '@/services/session';

assertNearChain();

export let ORDER_PAYMENT_FACTORY_ADDRESS = '';

const ESCROW_EXPIRATION_WINDOW_MS = 15 * 60 * 1000;
const ESCROW_STATUS_PENDING = 'pending' as const;

export const ESCROW_ERROR_CODES = {
  scopeMissing: 'ERR_SCOPE_MISSING',
  kycRequired: 'ERR_KYC_REQUIRED',
  duplicateNonce: 'ERR_DUPLICATE_NONCE',
  deploymentFailed: 'ERR_ESCROW_DEPLOY',
} as const;

export type EscrowErrorCode =
  (typeof ESCROW_ERROR_CODES)[keyof typeof ESCROW_ERROR_CODES];

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
  status: typeof ESCROW_STATUS_PENDING;
}

export async function getOrderPaymentFactoryAddress(): Promise<string> {
  if (!ORDER_PAYMENT_FACTORY_ADDRESS) {
    const settings = await fetchSettings();
    ORDER_PAYMENT_FACTORY_ADDRESS =
      settings.paymentFactoryAddress ||
      config.EXPO_PUBLIC_CONTRACT_ID || '';
  }
  return ORDER_PAYMENT_FACTORY_ADDRESS;
}

async function sendNear(message: string): Promise<string> {
  return retryWithBackoff(async () => chainAdapter.signMessage?.(message) || '');
}

async function assertAdmin(action: string) {
  if (!(await isAdmin())) {
    adminTransactionIntegrity.inc({ action, result: 'unauthorized' });
    throw new Error('Admin privileges required');
  }
}

export async function deployEscrow(
  draft: DeployEscrowDraft,
): Promise<DeployEscrowResult> {
  const session = draft.sessionToken ? getSession(draft.sessionToken) : undefined;
  if (draft.sessionToken && !session) {
    throw new Error(ESCROW_ERROR_CODES.scopeMissing);
  }
  if (session && !session.scopes.includes(CHECKOUT_SCOPE)) {
    throw new Error(ESCROW_ERROR_CODES.scopeMissing);
  }

  const combinedScopes = new Set<string>(Array.isArray(draft.scopes) ? draft.scopes : []);
  if (session?.scopes) {
    for (const scope of session.scopes) {
      combinedScopes.add(scope);
    }
  }

  if (!combinedScopes.has(CHECKOUT_SCOPE)) {
    throw new Error(ESCROW_ERROR_CODES.scopeMissing);
  }

  if (typeof draft.nonce !== 'string' || draft.nonce.length === 0) {
    throw new Error(ESCROW_ERROR_CODES.duplicateNonce);
  }

  if (session?.checkoutNonce && session.checkoutNonce !== draft.nonce) {
    throw new Error(ESCROW_ERROR_CODES.duplicateNonce);
  }

  if (!draft.kycReceiptHash) {
    throw new Error(ESCROW_ERROR_CODES.kycRequired);
  }

  const end = serviceLatency.startTimer({ service: 'near.deployEscrow' });
  try {
    const factoryAddress = await getOrderPaymentFactoryAddress();
    const txHash = await sendNear(
      `Pay:${draft.total}:${draft.feeAddress}:${draft.feeBps}:${draft.nonce}`,
    );
    logger.info(
      {
        service: 'near.deployEscrow',
        txHash,
        contractAddress: factoryAddress,
        nonce: draft.nonce,
        buyerAddress: draft.buyerAddress,
        sellerAddress: draft.sellerAddress,
      },
      'Escrow deployment submitted',
    );
    return {
      contractAddress: factoryAddress,
      txHash,
      expiresAt: new Date(Date.now() + ESCROW_EXPIRATION_WINDOW_MS).toISOString(),
      status: ESCROW_STATUS_PENDING,
    };
  } catch (e) {
    serviceFailures.inc({ service: 'near.deployEscrow' });
    errorLog('Failed to deploy escrow', e);
    logger.error({ err: e }, 'Failed to deploy escrow');
    throw new Error(ESCROW_ERROR_CODES.deploymentFailed);
  } finally {
    end();
  }
}

export async function releasePayment(contractAddress: string): Promise<string> {
  await assertAdmin('near.releasePayment');
  const end = serviceLatency.startTimer({ service: 'near.releasePayment' });
  try {
    const tx = await sendNear(`Release:${contractAddress}`);
    logger.info({ service: 'near.releasePayment', contractAddress }, 'Payment released');
    adminTransactionIntegrity.inc({ action: 'near.releasePayment', result: 'success' });
    return tx;
  } catch (e) {
    serviceFailures.inc({ service: 'near.releasePayment' });
    errorLog('Failed to release payment', e);
    logger.error({ err: e }, 'Failed to release payment');
    adminTransactionIntegrity.inc({ action: 'near.releasePayment', result: 'failure' });
    throw e;
  } finally {
    end();
  }
}

export async function refundPayment(contractAddress: string): Promise<string> {
  await assertAdmin('near.refundPayment');
  const end = serviceLatency.startTimer({ service: 'near.refundPayment' });
  try {
    const tx = await sendNear(`Refund:${contractAddress}`);
    logger.info({ service: 'near.refundPayment', contractAddress }, 'Payment refunded');
    adminTransactionIntegrity.inc({ action: 'near.refundPayment', result: 'success' });
    return tx;
  } catch (e) {
    serviceFailures.inc({ service: 'near.refundPayment' });
    errorLog('Failed to refund payment', e);
    logger.error({ err: e }, 'Failed to refund payment');
    adminTransactionIntegrity.inc({ action: 'near.refundPayment', result: 'failure' });
    throw e;
  } finally {
    end();
  }
}

export async function adminResolve(
  contractAddress: string,
  toSeller: boolean,
): Promise<string> {
  await assertAdmin('near.adminResolve');
  const end = serviceLatency.startTimer({ service: 'near.adminResolve' });
  try {
    const tx = await sendNear(
      `AdminResolve:${contractAddress}:${toSeller ? 1 : 0}`,
    );
    logger.info({ service: 'near.adminResolve', contractAddress }, 'Dispute resolved');
    adminTransactionIntegrity.inc({ action: 'near.adminResolve', result: 'success' });
    return tx;
  } catch (e) {
    serviceFailures.inc({ service: 'near.adminResolve' });
    errorLog('Failed to resolve dispute', e);
    logger.error({ err: e }, 'Failed to resolve dispute');
    adminTransactionIntegrity.inc({ action: 'near.adminResolve', result: 'failure' });
    throw e;
  } finally {
    end();
  }
}

