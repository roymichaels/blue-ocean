import TonWeb from 'tonweb';
import { Order } from '../types';

const tonweb = new TonWeb();

/**
 * Deploys a new order payment contract on-chain.
 * Returns the deployed contract address.
 */
export async function initOrderContract(): Promise<string> {
  // In a full implementation this would compile and deploy the
  // `contracts/order-payment.tact` contract. For now we simply
  // return a placeholder address so the rest of the app can
  // proceed without a live TON connection.
  return '0:' + Math.random().toString(16).slice(2);
}

/**
 * Sends the buyer's payment to the escrow contract and returns
 * the resulting transaction hash.
 */
export async function payOrder(order: Order): Promise<string> {
  try {
    // Real implementation would construct a transfer to the
    // deployed contract using tonweb or TonConnect.
    // The hash here is mocked to keep the interface functional
    // in offline or test environments.
    const hash = '0x' + Math.random().toString(16).slice(2);
    return hash;
  } catch (e) {
    console.error('Failed to pay order', e);
    throw e;
  }
}

/**
 * Releases escrowed funds to the seller. The returned string is
 * the transaction hash for the release message.
 */
export async function releaseFunds(contractAddress: string): Promise<string> {
  try {
    // Real implementation would send a release message to the
    // contract; here we just return a mock transaction hash.
    const hash = '0x' + Math.random().toString(16).slice(2);
    return hash;
  } catch (e) {
    console.error('Failed to release funds', e);
    throw e;
  }
}
