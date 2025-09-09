import { errorLog } from '@/utils/logger';
import { chainAdapter } from '@/services/chain';
import { fetchSettings } from './nearSettings';
import { assertNearChain } from './chain';
import config from '@/config';

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

export async function deployOrderPayment(
  amount: number,
): Promise<{ contractAddress: string; txHash: string }> {
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
    return { contractAddress: factoryAddress, txHash };
  } catch (e) {
    serviceFailures.inc({ service: 'near.deployOrderPayment' });
    errorLog('Failed to deploy order payment', e);
    logger.error({ err: e }, 'Failed to deploy order payment');
    throw e;
  } finally {
    end();
  }
}

export async function releasePayment(contractAddress: string): Promise<string> {
  const end = serviceLatency.startTimer({ service: 'near.releasePayment' });
  try {
    const tx = await sendNear(`Release:${contractAddress}`);
    logger.info({ service: 'near.releasePayment', contractAddress }, 'Payment released');
    return tx;
  } catch (e) {
    serviceFailures.inc({ service: 'near.releasePayment' });
    errorLog('Failed to release payment', e);
    logger.error({ err: e }, 'Failed to release payment');
    throw e;
  } finally {
    end();
  }
}

export async function refundPayment(contractAddress: string): Promise<string> {
  const end = serviceLatency.startTimer({ service: 'near.refundPayment' });
  try {
    const tx = await sendNear(`Refund:${contractAddress}`);
    logger.info({ service: 'near.refundPayment', contractAddress }, 'Payment refunded');
    return tx;
  } catch (e) {
    serviceFailures.inc({ service: 'near.refundPayment' });
    errorLog('Failed to refund payment', e);
    logger.error({ err: e }, 'Failed to refund payment');
    throw e;
  } finally {
    end();
  }
}

export async function adminResolve(
  contractAddress: string,
  toSeller: boolean,
): Promise<string> {
  const end = serviceLatency.startTimer({ service: 'near.adminResolve' });
  try {
    const tx = await sendNear(
      `AdminResolve:${contractAddress}:${toSeller ? 1 : 0}`,
    );
    logger.info({ service: 'near.adminResolve', contractAddress }, 'Dispute resolved');
    return tx;
  } catch (e) {
    serviceFailures.inc({ service: 'near.adminResolve' });
    errorLog('Failed to resolve dispute', e);
    logger.error({ err: e }, 'Failed to resolve dispute');
    throw e;
  } finally {
    end();
  }
}

