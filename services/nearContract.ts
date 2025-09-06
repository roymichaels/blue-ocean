import { errorLog } from '@/utils/logger';
import { chainAdapter } from '@/services/chain';
import { fetchSettings } from './nearSettings';
import { assertNearChain } from './chain';

assertNearChain();

export let ORDER_PAYMENT_FACTORY_ADDRESS = '';

export async function getOrderPaymentFactoryAddress(): Promise<string> {
  if (!ORDER_PAYMENT_FACTORY_ADDRESS) {
    const settings = await fetchSettings();
    ORDER_PAYMENT_FACTORY_ADDRESS =
      settings.paymentFactoryAddress ||
      process.env.EXPO_PUBLIC_CONTRACT_ID || '';
  }
  return ORDER_PAYMENT_FACTORY_ADDRESS;
}

async function sendNear(message: string): Promise<string> {
  return chainAdapter.signMessage?.(message) || '';
}

export async function deployOrderPayment(
  amount: number,
): Promise<{ contractAddress: string; txHash: string }> {
  try {
    const factoryAddress = await getOrderPaymentFactoryAddress();
    const settings = await fetchSettings();
    const feeAddress = settings.feeAddress ?? '';
    const feeBps = settings.feeBps ?? 0;
    const txHash = await sendNear(
      `Pay:${amount}:${feeAddress}:${feeBps}`,
    );
    return { contractAddress: factoryAddress, txHash };
  } catch (e) {
    errorLog('Failed to deploy order payment', e);
    throw e;
  }
}

export async function releasePayment(contractAddress: string): Promise<string> {
  try {
    return await sendNear(`Release:${contractAddress}`);
  } catch (e) {
    errorLog('Failed to release payment', e);
    throw e;
  }
}

export async function refundPayment(contractAddress: string): Promise<string> {
  try {
    return await sendNear(`Refund:${contractAddress}`);
  } catch (e) {
    errorLog('Failed to refund payment', e);
    throw e;
  }
}

export async function adminResolve(
  contractAddress: string,
  toSeller: boolean,
): Promise<string> {
  try {
    return await sendNear(
      `AdminResolve:${contractAddress}:${toSeller ? 1 : 0}`,
    );
  } catch (e) {
    errorLog('Failed to resolve dispute', e);
    throw e;
  }
}

