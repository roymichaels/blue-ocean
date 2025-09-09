use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, AccountId, BorshStorageKey, PanicOnDefault, Promise};

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
    pub fn add_listing(
        &mut self,
        contract_id: String,
        token_id: String,
        seller: AccountId,
        price: U128,
    ) {
        assert_eq!(
            env::predecessor_account_id(),
            seller,
            "seller must be predecessor"
        );
        let listing = Listing {
            seller: seller.clone(),
            price,
        };
        let key = (contract_id.clone(), token_id.clone());
        self.listings.insert(&key, &listing);
        env::log_str(
            &near_sdk::serde_json::json!({
                "event": "add_listing",
                "contract_id": contract_id,
                "token_id": token_id,
                "seller": seller,
                "price": listing.price
            })
            .to_string(),
        );
    }

    /// Buy a listing. Removes the listing, transfers funds and logs the purchase event.
    pub fn buy_listing(&mut self, contract_id: String, token_id: String) {
        let buyer = env::predecessor_account_id();
        let deposit = env::attached_deposit();
        let key = (contract_id.clone(), token_id.clone());
        let listing = self.listings.remove(&key).expect("listing not found");
        assert!(deposit >= listing.price.0, "insufficient deposit");
        let fee = listing.price.0 * self.fee_bps as u128 / 10_000u128;
        let seller_amount = listing.price.0 - fee;
        Promise::new(listing.seller.clone()).transfer(seller_amount);
        Promise::new(self.treasury.clone()).transfer(fee);
        env::log_str(
            &near_sdk::serde_json::json!({
                "event": "buy_listing",
                "contract_id": contract_id,
                "token_id": token_id,
                "buyer": buyer,
                "seller": listing.seller,
                "price": listing.price,
                "fee": U128(fee),
                "seller_amount": U128(seller_amount),
                "treasury": self.treasury
            })
            .to_string(),
        );
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

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{test_utils::VMContextBuilder, testing_env};

    fn init() -> Marketplace {
        Marketplace::init(0, AccountId::new_unchecked("treasury.near".to_string()))
    }

    #[test]
    fn unauthorized_add_listing_fails() {
        let mut context = VMContextBuilder::new();
        context.predecessor_account_id(AccountId::new_unchecked("alice.near".to_string()));
        testing_env!(context.build());
        let mut contract = init();
        let result = std::panic::catch_unwind(move || {
            contract.add_listing(
                "nft.near".to_string(),
                "1".to_string(),
                AccountId::new_unchecked("bob.near".to_string()),
                U128(10),
            );
        });
        assert!(result.is_err());
    }

    #[test]
    fn buy_listing_insufficient_deposit_fails() {
        // seller adds a listing
        let mut context = VMContextBuilder::new();
        context.predecessor_account_id(AccountId::new_unchecked("seller.near".to_string()));
        testing_env!(context.build());
        let mut contract = init();
        contract.add_listing(
            "nft.near".to_string(),
            "1".to_string(),
            AccountId::new_unchecked("seller.near".to_string()),
            U128(100),
        );

        // buyer attempts to buy with insufficient deposit
        let mut context = VMContextBuilder::new();
        context
            .predecessor_account_id(AccountId::new_unchecked("buyer.near".to_string()))
            .attached_deposit(50);
        testing_env!(context.build());
        let result = std::panic::catch_unwind(move || {
            contract.buy_listing("nft.near".to_string(), "1".to_string());
        });
        assert!(result.is_err());
    }
}
