const STUB_MESSAGE = 'NEAR removed; pending Supabase refactor';
const notImplemented = (name: string): never => {
  throw new Error(`NotImplemented: ${name} (${STUB_MESSAGE})`);
};

export interface Listing {
  id: number;
  seller: string;
  price: number;
}

export interface AddListingArgs {
  storeId: string;
  itemId: number;
  priceYocto: string;
  metadata: string;
}

export interface BuyListingArgs {
  storeId: string;
  itemId: number;
  amountYocto: string;
}

export async function getListings(_storeId: string): Promise<Listing[]> {
  return notImplemented('sdk-near:getListings');
}

export async function addListing(_args: AddListingArgs): Promise<never> {
  return notImplemented('sdk-near:addListing');
}

export async function buyListing(_args: BuyListingArgs): Promise<never> {
  return notImplemented('sdk-near:buyListing');
}

export async function payPrivately(_args: BuyListingArgs): Promise<never> {
  return notImplemented('sdk-near:payPrivately');
}

export default {
  getListings,
  addListing,
  buyListing,
  payPrivately,
};
