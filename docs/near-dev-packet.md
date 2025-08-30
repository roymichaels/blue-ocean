# NEAR Developer Packet

A consolidated guide to wire BlueOcean’s NEAR-first, gasless, multi‑tenant stack.

---

## 0) Prereqs & Mental Model

- Single contract (Rust/WASM): multi‑tenant keyed by `storeId`.
- Gasless UX: a relayer submits `functionCall` on behalf of the user.
- Reads: NEAR Lake streams contract logs into a small DB for fast UI.
- Wallet (optional for MVP): Wallet Selector for account connect; relayer still works without it.

---

## 1) Wallet Selector (Frontend)

### Install
```bash
yarn add near-api-js @near-wallet-selector/core @near-wallet-selector/near-wallet
```

### Init
```ts
// apps/web/services/near.ts
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';

let selector: any;

export async function initNear() {
  if (selector) return { selector };
  selector = await setupWalletSelector({
    network: 'testnet',
    modules: [setupNearWallet()],
  });
  return { selector };
}

export async function getAccountId(): Promise<string | null> {
  const { selector } = await initNear();
  const state = selector.store.getState();
  return state.accounts[0]?.accountId || null;
}
```

### Connect UI
```tsx
// apps/web/app/_layout.tsx
useEffect(() => { initNear() }, []);
<WalletButton />
```

---

## 2) near-api-js (Relayer + Fallback Calls)

### Create connection + account
```ts
import { connect, keyStores, utils } from 'near-api-js';

export async function makeNear(accountId: string, privateKey: string) {
  const ks = new keyStores.InMemoryKeyStore();
  await ks.setKey('testnet', accountId, utils.KeyPair.fromString(privateKey));
  return connect({
    networkId: 'testnet',
    nodeUrl: process.env.NEAR_RPC_URL || 'https://rpc.testnet.near.org',
    keyStore: ks,
  });
}
```

### Call contract function (change)
```ts
export async function callFunction({
  accountId, privateKey, contractId, methodName, args, gas, depositYocto
}: any) {
  const near = await makeNear(accountId, privateKey);
  const account = await near.account(accountId);
  return account.functionCall({
    contractId,
    methodName,
    args,
    gas: gas ?? '150000000000000',            // 150 Tgas
    attachedDeposit: depositYocto ?? '0',     // yoctoⓃ
  });
}
```

### View function (read)
```ts
export async function viewFunction({ contractId, methodName, args }: any) {
  const near = await makeNear('dummy.testnet', utils.KeyPair.fromRandom('ed25519').toString());
  const account = await (await near).account('dummy.testnet');
  return account.viewFunction({ contractId, methodName, args });
}
```

---

## 3) Marketplace Contract (Rust/WASM)

### Cargo.toml (essentials)
```toml
[package]
name = "marketplace"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
near-sdk = "4"

[profile.release]
codegen-units = 1
opt-level = "z"
lto = true
panic = "abort"
```

### Contract skeleton
```rust
use near_sdk::{near_bindgen, env, require, AccountId, Promise, BorshStorageKey};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Serialize, Deserialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::U128;

#[derive(BorshSerialize, BorshStorageKey)]
enum Keys { Listings }

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Listing {
    pub seller: AccountId,
    pub price: U128,
    pub metadata: String,
    pub store_id: String,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize)]
pub struct Marketplace {
    pub fee_bps: u16,
    pub treasury: AccountId,
    pub listings: UnorderedMap<(String,String), Listing>, // (storeId, itemId)
}

impl Default for Marketplace {
    fn default() -> Self { env::panic_str("Use init()") }
}

#[near_bindgen]
impl Marketplace {
    #[init]
    pub fn init(fee_bps: u16, treasury: AccountId) -> Self {
        require!(!env::state_exists(), "Already initialized");
        Self {
            fee_bps,
            treasury,
            listings: UnorderedMap::new(Keys::Listings),
        }
    }

    pub fn add_listing(&mut self, store_id: String, item_id: String, price: U128, metadata: String) {
        let seller = env::predecessor_account_id();
        let key = (store_id.clone(), item_id.clone());
        let listing = Listing { seller: seller.clone(), price, metadata, store_id: store_id.clone() };
        self.listings.insert(&key, &listing);
        env::log_str(&format!(r#"{{"event":"listing_added","storeId":"{}","itemId":"{}","price":"{}","seller":"{}"}}"#,
            store_id, item_id, price.0, seller));
    }

    #[payable]
    pub fn buy_listing(&mut self, store_id: String, item_id: String) {
        let key = (store_id.clone(), item_id.clone());
        let mut listing = self.listings.get(&key).expect("Listing not found");
        let amount = env::attached_deposit();
        require!(amount >= listing.price.0, "Insufficient deposit");
        let fee = amount * (self.fee_bps as u128) / 10_000u128;
        let seller_amt = amount - fee;

        Promise::new(self.treasury.clone()).transfer(fee);
        Promise::new(listing.seller.clone()).transfer(seller_amt);

        env::log_str(&format!(r#"{{"event":"order_paid","storeId":"{}","itemId":"{}","amount":"{}","buyer":"{}"}}"#,
            store_id, item_id, amount, env::predecessor_account_id()));
    }

    pub fn get_listing(&self, store_id: String, item_id: String) -> Option<Listing> {
        self.listings.get(&(store_id, item_id))
    }

    pub fn get_listings(&self, store_id: String, from: Option<u32>, limit: Option<u32>) -> Vec<(String, Listing)> {
        let start = from.unwrap_or(0) as usize;
        let lim = limit.unwrap_or(50) as usize;
        self.listings
            .iter()
            .filter(|((sid,_),_)| sid == &store_id)
            .skip(start).take(lim)
            .map(|((_, id), l)| (id, l))
            .collect()
    }
}
```

### Build & deploy (testnet)
```bash
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
near create-account marketplace.<you>.testnet --masterAccount <you>.testnet
near deploy marketplace.<you>.testnet --wasmFile target/wasm32-unknown-unknown/release/marketplace.wasm
near call marketplace.<you>.testnet init '{"fee_bps":100,"treasury":"treasury.<you>.testnet"}' --accountId <you>.testnet
```

---

## 4) Gasless Relayer (Node/TS)

### Install
```bash
yarn add express zod near-api-js tweetnacl
```

### Server
```ts
// relayer/src/server.ts
import express from 'express';
import { z } from 'zod';
import { callFunction } from './near'; // use near-api-js wrapper above

const app = express(); app.use(express.json());

const Body = z.object({
  action: z.enum(['add_listing','buy_listing']),
  args: z.record(z.any())
});

app.post('/meta-tx', async (req, res) => {
  try {
    const { action, args } = Body.parse(req.body);
    // basic allowlist + limits
    if (action === 'buy_listing') {
      if (!args.amountYocto) return res.status(400).json({error:'amountYocto required'});
    }
    const out = await callFunction({
      accountId: process.env.RELAYER_ACCOUNT_ID!,
      privateKey: process.env.RELAYER_PRIVATE_KEY!,
      contractId: process.env.CONTRACT_ID!,
      methodName: action,
      args,
      gas: process.env.MAX_GAS || '150000000000000',
      depositYocto: args.amountYocto || '0'
    });
    return res.json({ tx: out.transaction.hash });
  } catch (e:any) {
    return res.status(400).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 8787, () => console.log('Relayer up'));
```

### .env (example)
```env
NEAR_RPC_URL=https://rpc.testnet.near.org
CONTRACT_ID=marketplace.<you>.testnet
RELAYER_ACCOUNT_ID=<acct>.testnet
RELAYER_PRIVATE_KEY=ed25519:...
PORT=8787
MAX_GAS=150000000000000
```

---

## 5) NEAR Lake Indexer (Node/TS)

### Install
```bash
yarn add near-lake-framework better-sqlite3
```

### Stream & upsert
```ts
// indexers/lake/src/store.ts
import Database from 'better-sqlite3';
const db = new Database(process.env.DB_PATH || 'lake.db');
db.exec(`
CREATE TABLE IF NOT EXISTS listings(store_id TEXT, item_id TEXT, price_cents INT, seller TEXT, metadata TEXT, updated_at INT);
CREATE TABLE IF NOT EXISTS orders(store_id TEXT, item_id TEXT, buyer TEXT, amount_yocto TEXT, tx_hash TEXT, created_at INT);
`);
export function upsertEvent(evt: any, tx?: string) {
  if (evt.event === 'listing_added') {
    const s = db.prepare(`REPLACE INTO listings(store_id,item_id,price_cents,seller,metadata,updated_at) VALUES (?,?,?,?,?,?)`);
    s.run(evt.storeId, evt.itemId, Number(evt.price)/10_4, evt.seller, evt.metadata || '', Date.now());
  }
  if (evt.event === 'order_paid') {
    const s = db.prepare(`INSERT INTO orders(store_id,item_id,buyer,amount_yocto,tx_hash,created_at) VALUES (?,?,?,?,?,?)`);
    s.run(evt.storeId, evt.itemId, evt.buyer, String(evt.amount), tx || '', Date.now());
  }
}
```

```ts
// indexers/lake/src/main.ts
import { start } from 'near-lake-framework';
import { upsertEvent } from './store';

start({
  s3BucketName: 'near-lake-data-testnet',
  startBlockHeight: Number(process.env.START_BLOCK || 0),
  filters: { accounts: [process.env.CONTRACT_ID!] },
  handleStreamerMessage: async (msg) => {
    for (const shard of msg.shards) {
      for (const reo of shard.receiptExecutionOutcomes) {
        const tx = reo.executionOutcome.id;
        for (const line of (reo.executionOutcome.outcome.logs || [])) {
          try { const evt = JSON.parse(line); if (evt.event) upsertEvent(evt, tx); } catch {}
        }
      }
    }
  },
});
```

---

## 6) Frontend SDK Wrapper

```ts
// packages/sdk-near/src/index.ts
export async function getListings(storeId: string) {
  const url = `${process.env.EXPO_PUBLIC_INDEXER_URL}/listings?storeId=${encodeURIComponent(storeId)}`;
  const r = await fetch(url); if (!r.ok) throw new Error('indexer error');
  return r.json();
}

export async function addListing(args: { storeId:string; itemId:string; priceYocto:string; metadata:string }) {
  const r = await fetch(`${process.env.EXPO_PUBLIC_RELAYER_URL}/meta-tx`, {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ action:'add_listing', args })
  });
  if (!r.ok) throw new Error('relayer error'); return r.json();
}

export async function buyListing(args: { storeId:string; itemId:string; amountYocto:string }) {
  const r = await fetch(`${process.env.EXPO_PUBLIC_RELAYER_URL}/meta-tx`, {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ action:'buy_listing', args })
  });
  if (!r.ok) throw new Error('relayer error'); return r.json();
}
```

---

## 7) CLI Quick Reference

### Build contract
```bash
cargo build --release --target wasm32-unknown-unknown
```

### Create account (testnet)
```bash
near create-account marketplace.<you>.testnet --masterAccount <you>.testnet
```

### Deploy
```bash
near deploy marketplace.<you>.testnet --wasmFile target/.../marketplace.wasm
```

### Init
```bash
near call marketplace.<you>.testnet init '{"fee_bps":100,"treasury":"treasury.<you>.testnet"}' --accountId <you>.testnet
```

### Add listing (manual test)
```bash
near call marketplace.<you>.testnet add_listing '{"store_id":"alpha","item_id":"sku1","price":"1000000000000000000000000","metadata":"{}"}' --accountId seller.<you>.testnet
```

### Buy listing
```bash
near call marketplace.<you>.testnet buy_listing '{"store_id":"alpha","item_id":"sku1"}' --accountId buyer.<you>.testnet --amount 1
```

---

## 8) Env & Flags

```env
# web
EXPO_PUBLIC_CHAIN=near
EXPO_PUBLIC_CONTRACT_ID=marketplace.<you>.testnet
EXPO_PUBLIC_RELAYER_URL=http://localhost:8787
EXPO_PUBLIC_INDEXER_URL=http://localhost:8788
EXPO_PUBLIC_DEFAULT_STORE=alpha
EXPO_PUBLIC_DEBUG_LOGS=1

# relayer
NEAR_RPC_URL=https://rpc.testnet.near.org
CONTRACT_ID=marketplace.<you>.testnet
RELAYER_ACCOUNT_ID=<acct>.testnet
RELAYER_PRIVATE_KEY=ed25519:...

# indexer
CONTRACT_ID=marketplace.<you>.testnet
LAKE_BUCKET=near-lake-data-testnet
DB_PATH=lake.db
START_BLOCK=0
```

---

## 9) Gotchas & Guardrails

- Always pass storeId to contract/SDK/indexer—no cross-tenant leakage.
- Fee math single source of truth (bps → yocto): reuse one helper.
- Relayer safety: allowlist methods, cap gas/deposit, rate-limit.
- Emit JSON logs from contract (strict schema) for Lake to parse.
- No TON imports anywhere; run depcheck, knip, ts-prune.
- CI gates: yarn typecheck && yarn lint && yarn doctor && yarn build:web.

---

## 10) Optional: Privacy Stub (Mixer Button)

```ts
export async function payPrivately({ storeId, itemId, amountYocto }: any) {
  // TODO: integrate mixer; for now fallback to normal buy
  return buyListing({ storeId, itemId, amountYocto });
}
```

---

## Appendix: BlueOcean App Tree (NEAR Edition)

```text
BlueOcean
├─ App Shell
│  ├─ Global Layout (Header, Footer, Toasts, Modals, Theme)
│  ├─ WalletConnect (NEAR Wallet Selector)
│  ├─ TenantContext (storeId, slug, config)
│  ├─ AuthContext (accountId, roles, session)
│  ├─ FeatureFlags (CHAIN='near', WALLET_ENABLED, DEBUG_LOGS)
│  └─ Polyfills (web/native) + HMR
│
├─ Public
│  ├─ /                          (Landing / marketing)
│  ├─ /store/[storeId]
│  │  ├─ /home                  (Hero, featured, promos)
│  │  ├─ /catalog
│  │  │  ├─ /products           (Grid, filters, dynamic pricing)
│  │  │  └─ /products/[id]      (PDP, gallery, metadata)
│  │  ├─ /cart                  (Drawer / Page)
│  │  ├─ /checkout              (Gasless via relayer OR private pay)
│  │  ├─ /orders                (User order list)
│  │  ├─ /orders/[id]           (Order detail, status, receipt)
│  │  ├─ /chat                  (Waku, store-specific)
│  │  └─ /legal/{terms,privacy}
│  └─ /status                   (Version + health)
│
├─ Store Owner (wallet role: store-owner)
│  ├─ /store/[storeId]/dashboard
│  │  ├─ Live sales KPIs
│  │  ├─ Orders feed + map
│  │  └─ System messages
│  ├─ /store/[storeId]/products
│  │  ├─ List / Bulk edit
│  │  ├─ New / Draft
│  │  └─ Edit/[productId]
│  ├─ /store/[storeId]/orders
│  │  ├─ Open / Completed
│  │  └─ View/[orderId]
│  ├─ /store/[storeId]/drivers
│  │  ├─ Capacity map / status
│  │  ├─ Invite flow
│  │  └─ View/[driverId]
│  ├─ /store/[storeId]/customers
│  ├─ /store/[storeId]/discounts
│  └─ /store/[storeId]/settings
│     ├─ Branding, Theme
│     ├─ Payments (NEAR Treasury)
│     ├─ Shipping, Taxes
│     ├─ Notifications (Waku/Email)
│     └─ Integrations (Pinata, Hooks)
│
├─ Platform Admin (wallet role: admin)
│  ├─ /admin/overview             (Global sales, node status)
│  ├─ /admin/stores
│  │  ├─ List / Create / Disable
│  │  └─ View/[storeId] (impersonate, monitor)
│  ├─ /admin/users                (Roles, store link)
│  ├─ /admin/orders               (Cross-tenant view)
│  ├─ /admin/fees                 (Platform fee %, treasury addr)
│  ├─ /admin/near                 (Contracts, relayer keys)
│  ├─ /admin/waku                 (Mesh peers, topics)
│  ├─ /admin/logs                 (Agent logs, lake indexer)
│  └─ /admin/settings             (Flags, Feature toggles)
│
├─ UI Components (reusable)
│  ├─ Navigation: TopBar, SideBar, Breadcrumbs, TenantSwitcher
│  ├─ Wallet: NEARConnectButton, AccountBadge
│  ├─ Catalog: ProductCard, ProductGrid, VariantSelector
│  ├─ Cart: CartDrawer, LineItem, QuantityPicker
│  ├─ Checkout: PaymentButton (Gasless), PayPrivatelyButton (ZK mix)
│  ├─ Orders: OrderRow, StatusBadge, Timeline
│  ├─ Drivers: DriverCard, LiveMap
│  ├─ Settings Forms: Field, Section, KeyField
│  ├─ Media: UploadButton, ImagePreview
│  ├─ Tables: DataTable, Paginator, ColumnSorter
│  └─ Feedback: Toast, Modal, Spinner, EmptyState
│
├─ Hooks & State
│  ├─ useTenant()           (storeId + slug logic)
│  ├─ useWallet()           (NEAR wallet state + connect)
│  ├─ useRelayer()          (Meta-tx status)
│  ├─ useCart()             (price calc + items)
│  ├─ useCheckout()         (gasless flow controller)
│  ├─ useOrders(), useProducts(), useDrivers()
│  ├─ useWaku()             (chat + topic)
│  └─ useDebugLog(), useFeatureFlag()
│
├─ Services / Agents
│  ├─ TenantAgent           (load store config by slug)
│  ├─ ProductsAgent         (indexer + contract fallback)
│  ├─ OrdersAgent           (relayer submit, status pull)
│  ├─ DriversAgent          (assignments, state)
│  ├─ UsersAgent            (wallet → roles)
│  ├─ NotificationsAgent    (email, Waku)
│  ├─ PaymentsAgent
│  │  ├─ NEAR: GaslessMetaTxClient (relayer)
│  │  └─ MixerClient (ZK mixer stub)
│  ├─ StorageAgent          (Pinata, IPFS gateway)
│  └─ IndexerClient         (Lake stream mirror)
│
├─ NEAR Contracts
│  ├─ Marketplace (WASM)
│  │  ├─ add_listing, buy_listing, get_listing
│  │  ├─ JSON logs emitted for events
│  │  └─ storeId isolation enforced in keys
│  └─ deploy script / schema
│
├─ Relayer
│  ├─ src/server.ts         (express, zod-validate)
│  ├─ POST /meta-tx         (buy, list, cancel)
│  ├─ .env: relayer keys, limits
│  └─ Dockerfile, service port
│
├─ Lake Indexer
│  ├─ src/main.ts           (NEAR Lake stream listener)
│  ├─ src/store.ts          (SQLite schema)
│  ├─ Table: listings
│  ├─ Table: orders
│  └─ Dockerfile
│
├─ Utilities
│  ├─ log/debug/errorLog
│  ├─ Fee math (bps → cents)
│  ├─ RoleGuards
│  ├─ Env sanity (EXPO_PUBLIC_CHAIN, .env checks)
│  └─ Contracts ABI helper
│
└─ DevOps
   ├─ Docker (web, relayer, indexer)
   ├─ Scripts (build:contract, deploy, lint, doctor)
   ├─ Akash config (ports, healthcheck)
   ├─ CI (build, typecheck, prune, deadcode)
   └─ launch.md (docs: E2E run setup)
```

