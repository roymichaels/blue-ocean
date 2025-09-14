use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{UnorderedMap, UnorderedSet};
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

/// Store metadata (lightweight identity for a store)
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct StoreMeta {
    pub id: String,
    pub owner: AccountId,
    pub name: String,
}

#[derive(BorshStorageKey, BorshSerialize)]
enum StorageKey {
    Listings,
    Admins,
    Stores,
}

#[derive(BorshDeserialize, BorshSerialize)]
struct FeeProposal {
    value: u16,
    approvals: Vec<AccountId>,
}

#[derive(BorshDeserialize, BorshSerialize)]
struct TreasuryProposal {
    value: AccountId,
    approvals: Vec<AccountId>,
}

/// Multi-tenant marketplace contract.
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Marketplace {
    pub fee_bps: u16,
    pub treasury: AccountId,
    pub listings: UnorderedMap<(String, String), Listing>,
    pub admins: UnorderedSet<AccountId>,
    pub required_admins: u8,
    pub fee_proposal: Option<FeeProposal>,
    pub treasury_proposal: Option<TreasuryProposal>,
    pub stores: UnorderedMap<String, StoreMeta>,
}

#[near_bindgen]
impl Marketplace {
    /// Initialize the marketplace with a fee (in basis points) and treasury account.
    #[init]
    pub fn init(
        fee_bps: u16,
        treasury: AccountId,
        admins: Vec<AccountId>,
        required_admins: u8,
    ) -> Self {
        let mut admin_set = UnorderedSet::new(StorageKey::Admins);
        for a in admins {
            admin_set.insert(&a);
        }
        Self {
            fee_bps,
            treasury,
            listings: UnorderedMap::new(StorageKey::Listings),
            admins: admin_set,
            required_admins,
            fee_proposal: None,
            treasury_proposal: None,
            stores: UnorderedMap::new(StorageKey::Stores),
        }
    }

    fn assert_admin(&self, account: &AccountId) {
        assert!(self.admins.contains(account), "admin only");
    }

    /// Create a new store owned by the predecessor (direct wallet tx).
    pub fn create_store(&mut self, store_id: String, name: String) {
        let owner = env::predecessor_account_id();
        assert!(self.stores.get(&store_id).is_none(), "store already exists");
        let meta = StoreMeta { id: store_id.clone(), owner: owner.clone(), name: name.clone() };
        self.stores.insert(&store_id, &meta);
        env::log_str(
            &near_sdk::serde_json::json!({
                "event": "store_created",
                "storeId": store_id,
                "owner": owner,
                "name": name,
            })
            .to_string(),
        );
    }

    /// Admin-only helper to create a store for a specific owner (relayer flow).
    pub fn create_store_for(&mut self, owner: AccountId, store_id: String, name: String) {
        let caller = env::predecessor_account_id();
        self.assert_admin(&caller);
        assert!(self.stores.get(&store_id).is_none(), "store already exists");
        let meta = StoreMeta { id: store_id.clone(), owner: owner.clone(), name: name.clone() };
        self.stores.insert(&store_id, &meta);
        env::log_str(
            &near_sdk::serde_json::json!({
                "event": "store_created",
                "storeId": store_id,
                "owner": owner,
                "name": name,
            })
            .to_string(),
        );
    }

    /// View method to fetch a store by id.
    pub fn get_store(&self, store_id: String) -> Option<StoreMeta> {
        self.stores.get(&store_id)
    }

    pub fn set_fee_bps(&mut self, fee_bps: u16) {
        let caller = env::predecessor_account_id();
        self.assert_admin(&caller);
        match &mut self.fee_proposal {
            Some(p) if p.value == fee_bps => {
                if !p.approvals.contains(&caller) {
                    p.approvals.push(caller.clone());
                }
                if p.approvals.len() as u8 >= self.required_admins {
                    self.fee_bps = fee_bps;
                    self.fee_proposal = None;
                }
            }
            _ => {
                self.fee_proposal = Some(FeeProposal { value: fee_bps, approvals: vec![caller] });
            }
        }
    }

    pub fn set_treasury(&mut self, treasury: AccountId) {
        let caller = env::predecessor_account_id();
        self.assert_admin(&caller);
        match &mut self.treasury_proposal {
            Some(p) if p.value == treasury => {
                if !p.approvals.contains(&caller) {
                    p.approvals.push(caller.clone());
                }
                if p.approvals.len() as u8 >= self.required_admins {
                    self.treasury = treasury;
                    self.treasury_proposal = None;
                }
            }
            _ => {
                self.treasury_proposal = Some(TreasuryProposal { value: treasury, approvals: vec![caller] });
            }
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
        assert_eq!(env::predecessor_account_id(), seller, "seller must be predecessor");
        let listing = Listing { seller: seller.clone(), price };
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
