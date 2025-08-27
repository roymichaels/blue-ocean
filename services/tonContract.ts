import { errorLog } from '@/utils/logger';
import TonWeb from 'tonweb';
import type { Cell } from 'tonweb/dist/types/boc/cell';
import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import nearAuth from './nearAuth';
import { fetchSettings } from './tonSettings';
import { requireEnv } from '../utils/appConfig';

export let ORDER_PAYMENT_FACTORY_ADDRESS = '';

export async function getOrderPaymentFactoryAddress(): Promise<string> {
  if (!ORDER_PAYMENT_FACTORY_ADDRESS) {
    const settings = await fetchSettings();
    ORDER_PAYMENT_FACTORY_ADDRESS =
      settings.paymentFactoryAddress ||
      requireEnv('TON_PAYMENT_FACTORY_ADDRESS');
  }
  return ORDER_PAYMENT_FACTORY_ADDRESS;
}

function makeComment(message: string): Cell {
  const cell = new TonWeb.boc.Cell();
  cell.bits.writeUint(0, 32);
  cell.bits.writeBytes(TonWeb.utils.stringToBytes(message));
  return cell;
}

async function sendTonConnect(messages: {
  address: string;
  amount: string;
  payload?: string;
  stateInit?: string;
}[]): Promise<string> {
  const sig = await nearAuth.signMessage(
    Buffer.from(JSON.stringify(messages)),
  );
  return sig;
}

export async function deployOrderPayment(
  amount: number,
): Promise<{ contractAddress: string; txHash: string }> {
  try {
    const factoryAddress = await getOrderPaymentFactoryAddress();
    const settings = await fetchSettings();
    const feeAddress = settings.feeAddress ?? '';
    const feeBps = settings.feeBps ?? 0;
    const payload = makeComment(`Pay:${amount}:${feeAddress}:${feeBps}`);
    const payloadBoc = TonWeb.utils.bytesToBase64(
      await payload.toBoc(false),
    );
    const txHash = await sendTonConnect([
      {
        address: factoryAddress,
        amount: TonWeb.utils.toNano(String(amount)).toString(),
        payload: payloadBoc,
      },
    ]);
    // Replace with actual derived contract address when available
    const contractAddress = factoryAddress;
    return { contractAddress, txHash };
  } catch (e) {
    errorLog('Failed to deploy order payment', e);
    throw e;
  }
}

export async function releasePayment(contractAddress: string): Promise<string> {
  try {
    const payload = makeComment('Release');
    const payloadBoc = TonWeb.utils.bytesToBase64(
      await payload.toBoc(false),
    );
    const txHash = await sendTonConnect([
      {
        address: contractAddress,
        amount: '0',
        payload: payloadBoc,
      },
    ]);
    return txHash;
  } catch (e) {
    errorLog('Failed to release payment', e);
    throw e;
  }
}

export async function refundPayment(contractAddress: string): Promise<string> {
  try {
    const payload = makeComment('Refund');
    const payloadBoc = TonWeb.utils.bytesToBase64(
      await payload.toBoc(false),
    );
    const txHash = await sendTonConnect([
      {
        address: contractAddress,
        amount: '0',
        payload: payloadBoc,
      },
    ]);
    return txHash;
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
    const payload = makeComment(`AdminResolve:${toSeller ? 1 : 0}`);
    const payloadBoc = TonWeb.utils.bytesToBase64(
      await payload.toBoc(false),
    );
    const txHash = await sendTonConnect([
      {
        address: contractAddress,
        amount: '0',
        payload: payloadBoc,
      },
    ]);
    return txHash;
  } catch (e) {
    errorLog('Failed to resolve dispute', e);
    throw e;
  }
}

