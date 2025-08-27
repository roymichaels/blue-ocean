// SDK functions for interacting with the Blue Ocean Near marketplace
// Uses relayer and indexer services defined by EXPO_PUBLIC_* env variables.

/** Represents a listing returned from the indexer. */
export interface Listing {
  id: number;
  seller: string;
  price: number;
}

/** Arguments required to add a new listing via the relayer. */
export interface AddListingArgs {
  id: number;
  seller: string;
  price: number;
}

/** Arguments required to purchase a listing via the relayer. */
export interface BuyListingArgs {
  id: number;
  buyer: string;
  amountYocto: string;
}

function requireEnv(name: 'EXPO_PUBLIC_RELAYER_URL' | 'EXPO_PUBLIC_INDEXER_URL'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

/** Fetch all listings from the indexer service. */
export async function getListings(): Promise<Listing[]> {
  const indexerUrl = requireEnv('EXPO_PUBLIC_INDEXER_URL');
  const res = await fetch(`${indexerUrl}/listings`);
  if (!res.ok) {
    throw new Error(`Failed to fetch listings: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (!Array.isArray(json)) {
    throw new Error('Invalid listings response');
  }
  return json as Listing[];
}

/** Submit a request to add a new listing through the relayer. */
export async function addListing(args: AddListingArgs): Promise<any> {
  const relayerUrl = requireEnv('EXPO_PUBLIC_RELAYER_URL');
  const res = await fetch(`${relayerUrl}/meta-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add_listing', args }),
  });
  if (!res.ok) {
    throw new Error(`Failed to add listing: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || 'Relayer error');
  }
  return json;
}

/** Submit a purchase request for a listing through the relayer. */
export async function buyListing(args: BuyListingArgs): Promise<any> {
  const relayerUrl = requireEnv('EXPO_PUBLIC_RELAYER_URL');
  const res = await fetch(`${relayerUrl}/meta-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'buy_listing', args }),
  });
  if (!res.ok) {
    throw new Error(`Failed to buy listing: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || 'Relayer error');
  }
  return json;
}

/**
 * Pay for a listing while attempting to preserve privacy.
 * TODO: integrate with mixer for on-chain privacy once available.
 */
export async function payPrivately(args: BuyListingArgs): Promise<any> {
  return buyListing(args);
}

export default { getListings, addListing, buyListing, payPrivately };

