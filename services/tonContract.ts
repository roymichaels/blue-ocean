import TonWeb from 'tonweb';
import { Buffer } from 'buffer';
import { Order } from '../types';
import { getTonConnect } from './tonAuth';

/**
 * Pre-deployed order-payment contract address.
 * Replace the placeholder with the actual address when shipping.
 */
export const ORDER_PAYMENT_ADDRESS =
  process.env.ORDER_PAYMENT_ADDRESS ?? 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

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

export async function payOrder(
  order: Order,
  contractAddress: string = ORDER_PAYMENT_ADDRESS,
): Promise<string> {
  try {
    const payload = makeComment(`Pay:${order.total}`);
    const payloadBoc = TonWeb.utils.bytesToBase64(
      await payload.toBoc({ idx: false }),
    );
    return await sendTonConnect([
      {
        address: contractAddress,
        amount: TonWeb.utils.toNano(String(order.total)).toString(),
        payload: payloadBoc,
      },
    ]);
  } catch (e) {
    console.error('Failed to pay order', e);
    throw e;
  }
}

export async function releaseFunds(
  contractAddress: string = ORDER_PAYMENT_ADDRESS,
): Promise<string> {
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
    console.error('Failed to release funds', e);
    throw e;
  }
}

export async function refundOrder(
  contractAddress: string = ORDER_PAYMENT_ADDRESS,
): Promise<string> {
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
    console.error('Failed to refund order', e);
    throw e;
  }
}

