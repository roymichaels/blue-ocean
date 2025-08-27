# NEAR Dev Packet

This guide shows how to build, deploy, initialize, and test the marketplace contract on NEAR testnet.

## Environment Variables

Copy `.env.example` to `.env` and populate the required values before running
the web app, relayer, or indexer. The example file groups variables by service
and documents default values such as `RELAYER_NODE_URL` (defaults to
`https://rpc.testnet.near.org`), `PORT` (3000), `START_BLOCK` (0), and
`DB_PATH` (`./lake.db`). For web builds you **must** set
`EXPO_PUBLIC_CHAIN=near`.

## Contract Commands

Replace `<you>` with your own testnet account name. The following account IDs must be adjusted before running the commands:

- `marketplace.<you>.testnet` – contract account
- `treasury.<you>.testnet` – fee recipient
- `seller.<you>.testnet` – seller account used in examples

### Build

```bash
cargo build --manifest-path contracts/marketplace/Cargo.toml --target wasm32-unknown-unknown --release
```

### Deploy

```bash
near deploy --wasmFile target/wasm32-unknown-unknown/release/marketplace.wasm --accountId marketplace.<you>.testnet
```

### Initialize

```bash
near call marketplace.<you>.testnet init '{"fee_bps": 500, "treasury": "treasury.<you>.testnet"}' --accountId marketplace.<you>.testnet
```

### Test Interaction

```bash
near call marketplace.<you>.testnet add_listing '{"contract_id":"nft.<you>.testnet","token_id":"1","seller":"seller.<you>.testnet","price":"1000000000000000000000000"}' --accountId seller.<you>.testnet
near view marketplace.<you>.testnet get_listings '{}'
```

