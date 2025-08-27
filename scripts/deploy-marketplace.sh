#!/usr/bin/env bash
set -euo pipefail

# Build the marketplace contract
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT_DIR="$ROOT_DIR/contracts/marketplace"

cargo build --manifest-path "$CONTRACT_DIR/Cargo.toml" --release

echo "Deploying marketplace contract to testnet..."
# TODO: Add actual deployment commands using your preferred TON toolchain
