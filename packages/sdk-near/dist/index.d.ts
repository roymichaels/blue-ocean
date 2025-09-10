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
export declare function getListings(storeId: string): Promise<Listing[]>;
/** Submit a request to add a new listing through the relayer. */
export declare function addListing(args: AddListingArgs): Promise<any>;
/** Submit a purchase request for a listing through the relayer. */
export declare function buyListing(args: BuyListingArgs): Promise<any>;
/**
 * Pay for a listing while attempting to preserve privacy.
 * TODO: integrate with mixer for on-chain privacy once available.
 */
export declare function payPrivately(args: BuyListingArgs): Promise<any>;
declare const _default: {
    getListings: typeof getListings;
    addListing: typeof addListing;
    buyListing: typeof buyListing;
    payPrivately: typeof payPrivately;
};
export default _default;
