import { errorLog } from '@/utils/logger';
import TonWeb from 'tonweb';
import type { Cell } from 'tonweb/dist/types/boc/cell';
import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { getTonConnect } from './tonAuth';
import { fetchSettings } from './tonSettings';

/**
 * Address of the OrderPayment factory contract.
 * Replace the placeholder with the actual address when shipping.
 */
export const ORDER_PAYMENT_FACTORY_ADDRESS =
  process.env.ORDER_PAYMENT_FACTORY_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

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
  const tonConnect = getTonConnect();
  if (!tonConnect) throw new Error('TonConnect not initialized');

  const result = await tonConnect.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 60,
    messages,
  });

  return TonWeb.utils.bytesToHex(
    createHash('sha256').update(Buffer.from(result.boc, 'base64')).digest(),
  );
}

export async function deployOrderPayment(
  amount: number,
): Promise<{ contractAddress: string; txHash: string }> {
  try {
    const settings = await fetchSettings();
    const feeAddress = settings.feeAddress ?? '';
    const feeBps = settings.feeBps ?? 0;
    const payload = makeComment(`Pay:${amount}:${feeAddress}:${feeBps}`);
    const payloadBoc = TonWeb.utils.bytesToBase64(
      await payload.toBoc(false),
    );
    const txHash = await sendTonConnect([
      {
        address: ORDER_PAYMENT_FACTORY_ADDRESS,
        amount: TonWeb.utils.toNano(String(amount)).toString(),
        payload: payloadBoc,
      },
    ]);
    // Replace with actual derived contract address when available
    const contractAddress = ORDER_PAYMENT_FACTORY_ADDRESS;
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

