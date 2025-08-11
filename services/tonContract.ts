// @ts-nocheck
import TonWeb from 'tonweb';
import { Buffer } from 'buffer';
import { getTonConnect } from './tonAuth';

/**
 * Address of the OrderPayment factory contract.
 * Replace the placeholder with the actual address when shipping.
 */
export const ORDER_PAYMENT_FACTORY_ADDRESS =
  process.env.ORDER_PAYMENT_FACTORY_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

function makeComment(message: string): TonWeb.boc.Cell {
  const cell = new TonWeb.boc.Cell();
  (cell.bits as any).writeUint(0, 32);
  (cell.bits as any).writeBytes(TonWeb.utils.stringToBytes(message));
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
    TonWeb.utils.sha256_sync(Buffer.from(result.boc, 'base64')),
  );
}

export async function deployOrderPayment(
  amount: number,
): Promise<{ contractAddress: string; txHash: string }> {
  try {
    const payload = makeComment(`Pay:${amount}`);
    const payloadBoc = TonWeb.utils.bytesToBase64(
      await payload.toBoc({ idx: false }),
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
    console.error('Failed to deploy order payment', e);
    throw e;
  }
}

export async function releasePayment(contractAddress: string): Promise<string> {
  try {
    const payload = makeComment('Release');
    const payloadBoc = TonWeb.utils.bytesToBase64(
      await payload.toBoc({ idx: false }),
    );
    return await sendTonConnect([
      {
        address: contractAddress,
        amount: '0',
        payload: payloadBoc,
      },
    ]);
  } catch (e) {
    console.error('Failed to release payment', e);
    throw e;
  }
}

export async function refundPayment(contractAddress: string): Promise<string> {
  try {
    const payload = makeComment('Refund');
    const payloadBoc = TonWeb.utils.bytesToBase64(
      await payload.toBoc({ idx: false }),
    );
    return await sendTonConnect([
      {
        address: contractAddress,
        amount: '0',
        payload: payloadBoc,
      },
    ]);
  } catch (e) {
    console.error('Failed to refund payment', e);
    throw e;
  }
}

