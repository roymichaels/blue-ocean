use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json::json;

/// A marketplace listing.
#[derive(Clone, Serialize, Deserialize)]
pub struct Listing {
    pub id: u64,
    pub seller: String,
    pub item: String,
    pub price: u64,
}

/// Multi-tenant marketplace contract.
/// `fee` is in basis points (1/10000).
pub struct Marketplace {
    fee: u64,
    treasury: String,
    listings: HashMap<u64, Listing>,
}

impl Marketplace {
    /// Create a new marketplace instance.
    pub fn new(fee: u64, treasury: String) -> Self {
        Self { fee, treasury, listings: HashMap::new() }
    }

    /// Create a listing. Returns `true` if the listing did not exist before.
    pub fn create_listing(&mut self, listing: Listing) -> bool {
        self.listings.insert(listing.id, listing).is_none()
    }

    /// Update an existing listing. Returns `true` if the listing existed.
    pub fn update_listing(&mut self, listing: Listing) -> bool {
        self.listings.insert(listing.id, listing).is_some()
    }

    /// Delete a listing. Returns `true` if the listing existed.
    pub fn delete_listing(&mut self, id: u64) -> bool {
        self.listings.remove(&id).is_some()
    }

    /// Buy a listing, emitting JSON logs about the sale.
    pub fn buy_listing(&mut self, id: u64, buyer: String, amount: u64) -> Result<(), String> {
        let listing = self
            .listings
            .remove(&id)
            .ok_or_else(|| "listing not found".to_string())?;
        if amount < listing.price {
            return Err("insufficient payment".into());
        }
        let fee_amount = listing.price * self.fee / 10_000;
        let seller_amount = listing.price - fee_amount;
        let log = json!({
            "event": "buy_listing",
            "listing_id": id,
            "buyer": buyer,
            "seller": listing.seller,
            "price": listing.price,
            "fee": fee_amount,
            "treasury": self.treasury,
            "seller_amount": seller_amount
        });
        println!("{}", log.to_string());
        Ok(())
    }
}

impl Default for Marketplace {
    fn default() -> Self {
        Self::new(0, String::new())
    }
}
