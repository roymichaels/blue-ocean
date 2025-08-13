# The Congress

This Expo project uses React Native with the Expo Router.

## Quickstart

```sh
yarn install
yarn dev        # mobile
yarn start      # web
yarn test
```

## Setup

1. **Install dependencies**

   ```sh
   yarn install
   ```

2. **Create a `.env` file**

   Copy `.env.example` to `.env` and fill in the required keys.

3. **Start the Expo project**

   - **Web**: `yarn start`
   - **Mobile**: `yarn dev`

4. **Connect a TON wallet**

   When the app loads, tap the wallet button to open the TonConnect modal. Scan the QR code with a wallet like Tonkeeper or use an injected extension to link your account.

### TON Address Format

Wallet addresses must use the standard TON formatting recognized by `@ton/core`. If an invalid address is provided, the app will display an "Invalid TON address" error and refuse to store it.

All data is ephemeral and synchronized between peers over Waku; no external services are required. All state is held in memory and hydrated from the Waku message history on boot. No database setup or SQL migrations are required, and all prior SQLite migration files have been removed from this repository.

### Development

Run the linter and TypeScript checker before committing:

```sh
yarn lint && yarn typecheck
```

The project uses Husky and `lint-staged` to run these checks on staged files.
Install the Git hooks after cloning:

```sh
yarn husky install
```

### Environment Variables

The project reads configuration from a `.env` file using Expo's env support
for `EXPO_PUBLIC_*` keys and `dotenv` for Node scripts and tests. Only a
minimal set of keys is supported. Copy `.env.example` to `.env` and set:

- `EXPO_PUBLIC_DEBUG_LOGS` – enable verbose logging (`true`/`false`)
- `EXPO_PUBLIC_WAKU_BOOTSTRAP` – comma-separated list of Waku peers
- `EXPO_PUBLIC_MOONPAY_PUBLISHABLE_KEY` – MoonPay public API key (optional;
  enables credit card purchases)

These values are read at build time and cannot be changed from the UI.

### Wallet Allowlist & Waku Bootstrap

Admin privileges are controlled by a list of wallet addresses stored in the
on-chain settings contract. Use the **Admin → Settings** screen or
`SettingsAgent.setAdmins()` to add or remove addresses. Only wallets in this
allowlist can manage users, products or other system settings.

The app connects to the peer-to-peer network through Waku bootstrap nodes
provided in `EXPO_PUBLIC_WAKU_BOOTSTRAP`. Supply a comma‑separated list of Waku
multiaddrs in the `.env` file so agents can discover peers. Leaving the value
empty runs the app in offline mode with no Waku connectivity.

### TON Smart Contracts

Smart contracts written in Tact live in `contracts/ton`. The helper scripts in
`scripts/` use `@tact-lang/compiler` for compiling contracts and `ton-core` for
deployment. No TON-specific environment variables are required; the deploy
script prompts for credentials or accepts them as CLI arguments.

Compile all contracts with:

```sh
yarn build:ton
# or
yarn ton:build
```

Compiled `.boc` files are written to `contracts/ton/build`.

To deploy a contract, pass the wallet mnemonic and (optionally) an RPC API key
as CLI arguments or via stdin when prompted:

```sh
yarn deploy:ton <contract-name> --mnemonic "<seed phrase>" --api-key "<key>"
# or
yarn ton:deploy <contract-name> --mnemonic "<seed phrase>" --api-key "<key>"
```

The script rotates through a list of public RPC endpoints and falls back on
the next one if a request fails. Use `--endpoint <url>` to override the RPC
endpoint manually.

Replace `<contract-name>` with the name of the Tact file (without extension).
The script derives the contract address, logs it, and writes it to
`constants/tonAddresses.json`. Start the Expo app normally with `yarn dev`.

### Credit Card Checkout

Providing `EXPO_PUBLIC_MOONPAY_PUBLISHABLE_KEY` populates `config.fiatKey`
and enables the `MoonPayModal` component for credit card purchases. Without
this key the MoonPay UI is hidden. Pass the wallet address, coin and USD amount
to display the widget in a modal and pre-fill the fiat amount.


Some dependencies rely on Node.js globals like `Buffer`, `process`, and
`crypto.subtle`. The `polyfills.js` file provides these shims for React Native
and web environments and **must only be imported once** from the app entry
point (`index.ts`). Importing polyfills elsewhere can lead to inconsistent
execution environments.

The polyfill also pulls in `react-native-get-random-values` and
`expo-standard-web-crypto` so `crypto.getRandomValues` and `crypto.subtle` are
available globally. It additionally exposes a synchronous SHA-512
implementation for `@noble/ed25519` so key generation works in every
environment.

### Hot Reloading

Metro resolves both `@expo/metro-runtime/src/HMRClient` and
`@expo/metro-runtime/src/HMRClient.ts` to the local `HMRClient.ts` wrapper.
TypeScript and webpack use the same aliases so all tools reference the wrapper
consistently. Polyfills are initialized at the app entry point, so the HMR
runtime runs within the already-prepared environment.

Metro also maps `react-native/Libraries/Utilities/HMRClient` to a stub
`EmptyHMRClient.ts` with no-op methods so bundling succeeds even when the native
implementation isn't available.

### Debugging & Logs

Call `debugLog()` for development-only messages. When
`EXPO_PUBLIC_DEBUG_LOGS=true` is set in `.env`, these messages are printed using
`console.debug`; otherwise they are suppressed. `errorLog()` always outputs
errors regardless of the flag. The value is evaluated at build time, so rebuild
after changing it.

### Session Persistence

User sessions are stored using `@react-native-async-storage/async-storage`.
On native platforms this uses the native AsyncStorage implementation and falls
back to `window.localStorage` when running on the web. This ensures
authentication state persists across reloads on every platform.

### Peer-to-Peer Synchronization

Settings, users, products and orders are now managed through TON-based
services rather than Waku. Each domain has a small agent that reads and writes
state via its corresponding TON service, keeping a local in-memory cache for
fast access.

Waku is only used for lightweight messaging such as chat and notification
payloads. Room keys used to encrypt chats are cached in an LRU map to keep
memory usage bounded, and encryption/decryption helpers now throw if a key
cannot be derived instead of returning plaintext.

### Web Notes

Fast Refresh can cause issues with Expo Router when running in the browser.
Disable it by setting `fastRefresh: false` in your web configuration.
The Waku chat integration is also not available on the web; the
`useWakuClient.web.ts` file provides a stub so the rest of the app can build
without the Waku SDK.


## Running the Project

Start the Expo development server with:

```sh
yarn dev
```

`yarn start` works as an alias of `yarn dev`.

### Running the Agents

The synchronization agents are part of the Expo app. When the development server
is running and the app is opened, each agent joins its Waku topic and begins
replicating data in memory. There is no separate service to launch.

### Building the Web PWA

Export the web build using Expo:

```sh
yarn build:web
```

The export step copies `public/tonconnect-manifest.json` into the `dist` folder
so wallets can load it from `/tonconnect-manifest.json` in production. After
deploying the static build, verify the manifest is accessible:

```sh
curl https://<your-site>/tonconnect-manifest.json
```

### IPFS Deployment Guide

Use the IPFS-friendly Vite build to create static assets with relative paths so
the app works from any gateway.

1. **Build**

   ```sh
   npm run web:release
   ```

2. **Preview locally**

   ```sh
   npm run web:preview
   ```

   Then open `http://localhost:4173/` and navigate within the app (no deep links).

3. **Upload to IPFS**

   ```sh
   ipfs add -r dist
   ```

   Pin the returned CID using your pinning service (e.g., Pinata) to publish it.

#### Pin `dist/` Checklist

1. `npm run web:release`
2. `node scripts/assert-relative-assets.js`
3. Pin the entire `dist/` folder to your IPFS node or pinning service
4. Record the returned CID for later reference

#### Gateway Test Steps

1. Open `https://ipfs.io/ipfs/<CID>/` and ensure the app loads
2. Repeat with another gateway such as `https://dweb.link/ipfs/<CID>/`
3. Navigate to a route like `/#/product/1` to confirm hash routing

Deep links require additional rewrite support.

## Debugging Tips

- Set `EXPO_PUBLIC_DEBUG_LOGS=true` to emit verbose agent logs.
- Run `expo start -c` to clear caches when Metro behaves oddly.
- Use React Native Debugger or Chrome DevTools for network inspection.
- Prefix commands with `DEBUG=waku:*` to trace Waku network traffic.

## Troubleshooting

### Content Security Policy

If the web app fails to load because of CSP errors (for example `Refused to connect to 'ws://localhost:19000'` or complaints about `unsafe-eval`), ensure your `Content-Security-Policy` header permits the Expo development endpoints and WebSocket connections. The webpack configuration uses `devtool: 'source-map'` to avoid `eval`, but strict policies may still require allowing `blob:` URLs and `ws://` origins.

### Bundler Aliases

Module resolution relies on custom aliases defined in `metro.config.js` and `webpack.config.js`. If the bundler cannot find modules like `@expo/metro-runtime/src/HMRClient` or `@noble/hashes`, verify those aliases exist and clear caches with `expo start -c`.

## Docker

Use Docker to run the project in a reproducible environment:

```sh
docker build -t blue-ocean .
docker run -p 19000-19002:19000-19002 blue-ocean
```

For hot reloading and easier development you can also use Docker Compose:

```sh
docker compose up
```

## Tests

Run the test suite with:

```sh
yarn test
```

Run `yarn install` before executing `yarn test` so Jest and other dependencies are present.

## Runbooks & Checklists

- [Incident Runbook](docs/incident-runbook.md)
- [QA Checklist](docs/checklists/qa.md)
- [Rollout Checklist](docs/checklists/rollout.md)

## Apple Pay Integration

The project uses MoonPay for purchasing crypto with a credit card. Set `EXPO_PUBLIC_MOONPAY_PUBLISHABLE_KEY` to enable it. To accept Apple Pay directly in the app, install the Expo Stripe payments package and configure your merchant identifier.

1. Install the library:
```sh
yarn add expo-payments-stripe
```
2. Add the plugin to **app.json**:
```json
{
  "expo": {
    "plugins": [["expo-payments-stripe", { "merchantIdentifier": "merchant.com.example" }]]
  }
}
```
3. Initialize Stripe when the app launches:
```ts
import { initStripe } from "expo-payments-stripe";

initStripe({
  publishableKey: "<your-stripe-key>",
  merchantIdentifier: "merchant.com.example",
});
```
4. Use `presentApplePay` from the library when the user checks out.

Refer to the Expo Stripe documentation for full setup details.

## Legacy

The previous `supabase/` directory and its SQL schema have been removed.
All data is handled in-memory and synchronized over Waku.

## License

This project is proprietary and not open source. All rights reserved.
See [LICENSE](LICENSE) for details.

***End of Document***
