use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::U128;
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, BorshStorageKey};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};

/// A marketplace listing.
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Listing {
    pub seller: AccountId,
    pub price: U128,
}

#[derive(BorshStorageKey, BorshSerialize)]
enum StorageKey {
    Listings,
}

/// Multi-tenant marketplace contract.
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Marketplace {
    pub fee_bps: u16,
    pub treasury: AccountId,
    pub listings: UnorderedMap<(String, String), Listing>,
}

#[near_bindgen]
impl Marketplace {
    /// Initialize the marketplace with a fee (in basis points) and treasury account.
    #[init]
    pub fn init(fee_bps: u16, treasury: AccountId) -> Self {
        Self {
            fee_bps,
            treasury,
            listings: UnorderedMap::new(StorageKey::Listings),
        }
    }

    /// Add a listing for a given contract and token id.
    pub fn add_listing(&mut self, contract_id: String, token_id: String, seller: AccountId, price: U128) {
        let listing = Listing { seller: seller.clone(), price };
        let key = (contract_id.clone(), token_id.clone());
        self.listings.insert(&key, &listing);
        env::log_str(&near_sdk::serde_json::json!({
            "event": "add_listing",
            "contract_id": contract_id,
            "token_id": token_id,
            "seller": seller,
            "price": listing.price
        }).to_string());
    }

    /// Buy a listing. Removes the listing and logs the purchase event.
    pub fn buy_listing(&mut self, contract_id: String, token_id: String, buyer: AccountId, amount: U128) {
        let key = (contract_id.clone(), token_id.clone());
        let listing = self.listings.remove(&key).expect("listing not found");
        assert!(amount.0 >= listing.price.0, "insufficient payment");
        let fee = listing.price.0 * self.fee_bps as u128 / 10_000u128;
        let seller_amount = listing.price.0 - fee;
        env::log_str(&near_sdk::serde_json::json!({
            "event": "buy_listing",
            "contract_id": contract_id,
            "token_id": token_id,
            "buyer": buyer,
            "seller": listing.seller,
            "price": listing.price,
            "fee": U128(fee),
            "seller_amount": U128(seller_amount),
            "treasury": self.treasury
        }).to_string());
    }

    /// Retrieve a single listing.
    pub fn get_listing(&self, contract_id: String, token_id: String) -> Option<Listing> {
        self.listings.get(&(contract_id, token_id))
    }

    /// Retrieve all listings.
    pub fn get_listings(&self) -> Vec<((String, String), Listing)> {
        self.listings.iter().collect()
    }
}
