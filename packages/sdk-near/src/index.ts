import { Buffer } from 'buffer';
import config, { relayerUrl, indexerUrl, contractId } from './config';

export interface Listing {
  id: number;
  seller: string;
  price: number;
}

async function fetchFromIndexer(): Promise<Listing[]> {
  if (!indexerUrl) {
    throw new Error('Indexer URL not configured');
  }
  const res = await fetch(`${indexerUrl}/listings`);
  if (!res.ok) {
    throw new Error(`Indexer error: ${res.status}`);
  }
  return (await res.json()) as Listing[];
}

async function fetchFromContract(): Promise<Listing[]> {
  if (!contractId) {
    throw new Error('Contract ID not configured');
  }
  const body = {
    jsonrpc: '2.0',
    id: 'dontcare',
    method: 'query',
    params: {
      request_type: 'call_function',
      finality: 'final',
      account_id: contractId,
      method_name: 'get_listings',
      args_base64: Buffer.from('{}').toString('base64'),
    },
  };
  const res = await fetch('https://rpc.testnet.near.org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`RPC error: ${res.status}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || 'RPC error');
  }
  const result = Buffer.from(json.result.result).toString();
  return JSON.parse(result) as Listing[];
}

export async function getListings(): Promise<Listing[]> {
  try {
    return await fetchFromIndexer();
  } catch {
    return fetchFromContract();
  }
}

export async function addListing(listing: Listing): Promise<any> {
  if (!relayerUrl) {
    throw new Error('Relayer URL not configured');
  }
  const res = await fetch(`${relayerUrl}/meta-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractId,
      methodName: 'create_listing',
      args: listing,
    }),
  });
  if (!res.ok) {
    throw new Error(`Relayer error: ${res.status}`);
  }
  return res.json();
}

export async function buyListing(id: number, buyer: string, amount: number): Promise<any> {
  if (!relayerUrl) {
    throw new Error('Relayer URL not configured');
  }
  const res = await fetch(`${relayerUrl}/meta-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractId,
      methodName: 'buy_listing',
      args: { id, buyer, amount },
    }),
  });
  if (!res.ok) {
    throw new Error(`Relayer error: ${res.status}`);
  }
  return res.json();
}

export { config };

export default { getListings, addListing, buyListing, config };
