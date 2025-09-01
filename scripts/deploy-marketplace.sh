#!/usr/bin/env bash
set -euo pipefail

# Build the marketplace contract
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT_DIR="$ROOT_DIR/contracts/marketplace"

cargo build --target wasm32-unknown-unknown --manifest-path "$CONTRACT_DIR/Cargo.toml" --release
WASM="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/marketplace.wasm"

echo "Deploying marketplace contract to testnet..."
near deploy --wasmFile "$WASM" --accountId "${1:-example.testnet}"
