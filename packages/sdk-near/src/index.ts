// SDK functions for interacting with the Blue Ocean NEAR marketplace
// Uses relayer and indexer services defined by EXPO_PUBLIC_* env variables.

/** Represents a listing returned from the indexer. */
export interface Listing {
  id: number;
  seller: string;
  price: number;
}

/** Arguments required to add a new listing via the relayer. */
export interface AddListingArgs {
  storeId: string;
  itemId: number;
  priceYocto: string;
  metadata: string;
}

/** Arguments required to purchase a listing via the relayer. */
export interface BuyListingArgs {
  storeId: string;
  itemId: number;
  amountYocto: string;
}

function requireEnv(
  name: 'EXPO_PUBLIC_RELAYER_URL' | 'EXPO_PUBLIC_INDEXER_URL' | 'EXPO_PUBLIC_TRANSPORT',
): string {
  const value = (config as Record<string, string>)[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

/** Fetch all listings from the indexer service. */
import { requireStoreId } from '@blue-ocean/utils';
import { canonicalJson } from './utils/serialization';
import config from './config';

export async function getListings(storeId: string): Promise<Listing[]> {
  const sid = requireStoreId(storeId);
  const transport = config.EXPO_PUBLIC_TRANSPORT || 'http';
  if (transport === 'waku') {
    // dynamic import to keep SDK usable without Waku
    const mod = await import('./waku/index').catch(() => null as any);
    if (mod?.getListingsFromWaku) return mod.getListingsFromWaku(sid);
  }
  const indexerUrl = requireEnv('EXPO_PUBLIC_INDEXER_URL');
  const res = await fetch(`${indexerUrl}/listings?storeId=${encodeURIComponent(sid)}`);
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
  const sid = requireStoreId(args.storeId);
  const relayerUrl = requireEnv('EXPO_PUBLIC_RELAYER_URL');
  const res = await fetch(`${relayerUrl}/meta-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: canonicalJson({
      storeId: sid,
      action: 'add_listing',
      args: { id: args.itemId, seller: '', price: 0, metadata: args.metadata, priceYocto: args.priceYocto },
    }),
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
  const sid = requireStoreId(args.storeId);
  const relayerUrl = requireEnv('EXPO_PUBLIC_RELAYER_URL');
  const res = await fetch(`${relayerUrl}/meta-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: canonicalJson({ storeId: sid, action: 'buy_listing', args }),
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
 * Tries to route the payment through an external mixer service.
 * If the mixer is misconfigured or fails, falls back to a normal
 * `buyListing` request so the user can still complete the purchase.
 */
export async function payPrivately(args: BuyListingArgs): Promise<any> {
  const sid = requireStoreId(args.storeId);
  const mixerUrl = config.EXPO_PUBLIC_MIXER_URL;
  if (!mixerUrl) return buyListing(args);
  try {
    // Step 1: request a proof from the mixer for this payment
    const proofRes = await fetch(`${mixerUrl}/proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: canonicalJson({ storeId: sid, itemId: args.itemId, amountYocto: args.amountYocto }),
    });
    if (!proofRes.ok) {
      throw new Error(`Proof request failed: ${proofRes.status} ${proofRes.statusText}`);
    }
    const proofJson = await proofRes.json();
    const proof = proofJson.proof;
    if (!proof) throw new Error('Mixer proof missing');

    // Step 2: submit the mixed payment with the proof
    const mixRes = await fetch(`${mixerUrl}/mix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: canonicalJson({ storeId: sid, proof, args: { itemId: args.itemId, amountYocto: args.amountYocto } }),
    });
    if (!mixRes.ok) {
      throw new Error(`Mixer payment failed: ${mixRes.status} ${mixRes.statusText}`);
    }
    const mixJson = await mixRes.json();
    if (mixJson.error) {
      throw new Error(mixJson.error.message || 'Mixer error');
    }
    return mixJson;
  } catch (err) {
    console.warn('payPrivately mixer failed, falling back to buyListing', err);
    return buyListing(args);
  }
}

export default { getListings, addListing, buyListing, payPrivately };

