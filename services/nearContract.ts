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

assertNearChain();

export let ORDER_PAYMENT_FACTORY_ADDRESS = '';

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

export async function deployOrderPayment(
  amount: number,
): Promise<{ contractAddress: string; txHash: string }> {
  await assertAdmin('near.deployOrderPayment');
  const end = serviceLatency.startTimer({ service: 'near.deployOrderPayment' });
  try {
    const factoryAddress = await getOrderPaymentFactoryAddress();
    const settings = await fetchSettings();
    const feeAddress = settings.feeAddress ?? '';
    const feeBps = settings.feeBps ?? 0;
    const txHash = await sendNear(
      `Pay:${amount}:${feeAddress}:${feeBps}`,
    );
    logger.info({ service: 'near.deployOrderPayment', txHash }, 'Order payment deployed');
    adminTransactionIntegrity.inc({ action: 'near.deployOrderPayment', result: 'success' });
    return { contractAddress: factoryAddress, txHash };
  } catch (e) {
    serviceFailures.inc({ service: 'near.deployOrderPayment' });
    errorLog('Failed to deploy order payment', e);
    logger.error({ err: e }, 'Failed to deploy order payment');
    adminTransactionIntegrity.inc({ action: 'near.deployOrderPayment', result: 'failure' });
    throw e;
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

