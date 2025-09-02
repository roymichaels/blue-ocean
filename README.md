# Blue Ocean

Blue Ocean is a decentralized e‑commerce demo built with React Native and the Expo Router.
Autonomous agents communicate over the Waku peer‑to‑peer network, keep their state in
memory, and hydrate from message history on boot. Configuration such as debug logging or
Waku bootstrap peers can be customized through `EXPO_PUBLIC_*` environment variables, but
defaults are provided for a zero‑config experience. All data is replicated via Waku topics
and NEAR smart contracts; the app does not use a local SQLite database.

See [docs/architecture.md](docs/architecture.md) for a high-level architecture overview and [docs/routes.md](docs/routes.md) for route and role details.

## Quickstart

Use **Yarn** for dependency management and running scripts.

```sh
yarn install
yarn dev        # mobile
yarn start      # web
yarn test
```

Then open `/` to see the Home screen.

## Design Tokens

Shared design tokens are re-exported from `src/shared/ui/tokens.ts`. Import `spacing`, `radius`, `colors`, `zIndex`, and `shadows` to keep styles consistent across components.

```ts
import { spacing, radius, zIndex, shadows } from '@/shared/ui/tokens';

const styles = StyleSheet.create({
  button: {
    padding: spacing.spacer16,
    borderRadius: radius.md,
    zIndex: zIndex.dropdown,
    ...shadows.sm.web,
  },
});
```

Tokens are also available at runtime through the `useTheme()` hook, which merges the current light/dark mode with any overrides:

```ts
const { tokens, colors } = useTheme();
// tokens.spacing.spacer16, colors.text.primary, ...
```


## Setup Guide

1. **Install dependencies**

   ```sh
   yarn install
   ```

2. *(Optional)* **Create a `.env` for customization**

   ```sh
   cp .env.example .env
   ```

   Only needed for advanced overrides such as custom Waku peers. See
   [Environment Variables](#environment-variables).

3. **Start the Expo project**

   - **Web**: `yarn start`
   - **Mobile**: `yarn dev`

4. **Connect a NEAR wallet**

   - Install a NEAR wallet such as [MyNearWallet](https://my.near.org).
   - When the app loads, tap the wallet button to open the NEAR Wallet Selector and sign in.

5. **Admin onboarding**

   - The wallet specified in `ADMIN_WALLET_ADDRESS` receives admin rights on first run.
   - To add more admins, open **Admin → Settings** and add additional wallet addresses or use `SettingsAgent.setAdmins()`.

All data is ephemeral and synchronized between peers over Waku and written to NEAR smart contracts when needed; no external services or local database are required. All state is held in memory and hydrated from the Waku message history on boot. No database setup or SQL migrations are required, and all prior SQLite migration files have been removed from this repository.

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

The app ships with sensible defaults and runs without a `.env` file. Environment
variables let you customize behavior or override settings for development and
deployment. To supply overrides locally, copy `.env.example` to `.env` and set
the desired values:

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `ADMIN_WALLET_ADDRESS` | yes | NEAR account granted admin rights if no on-chain list exists. |
| `NEAR_RPC_URL` | no | Primary NEAR RPC endpoint used for blockchain calls. Overrides tenant setting. |
| `EXPO_PUBLIC_CONTRACT_ID` | yes | Marketplace contract account the app interacts with. |
| `EXPO_PUBLIC_WAKU_BOOTSTRAP` | no | Comma-separated list of Waku peers for network bootstrap. |
| `EXPO_PUBLIC_DEBUG_LOGS` | no | Set to `true` to enable verbose logging. |
| `EXPO_PUBLIC_PINATA_API_KEY` | no | Pinata API key for authenticated uploads. |
| `EXPO_PUBLIC_PINATA_SECRET_API_KEY` | no | Pinata API secret for authenticated uploads. |
| `EXPO_PUBLIC_PINATA_JWT` | no | Pinata JWT used by the app and `scripts/pinata-upload.ts`. |

The OrderPayment factory contract address is configured by admins through the
**Admin → Settings** dashboard and does not require an environment variable.

`NEAR_STRICT` remains permissive in development, so local runs skip strict NEAR validation.

- `ADMIN_WALLET_ADDRESS` – NEAR account granted admin rights if no on-chain list exists (required)
- `NEAR_RPC_URL` – primary NEAR RPC endpoint used for blockchain calls (optional; overrides tenant setting)
- `EXPO_PUBLIC_CONTRACT_ID` – marketplace contract account the app interacts with (required)
- `EXPO_PUBLIC_DEBUG_LOGS` – enable verbose logging (`true`/`false`, default `false`)
- `EXPO_PUBLIC_WAKU_BOOTSTRAP` – comma-separated list of Waku peers (optional override)
- `EXPO_PUBLIC_PINATA_API_KEY` – Pinata API key for uploads (optional)
- `EXPO_PUBLIC_PINATA_SECRET_API_KEY` – Pinata secret API key for uploads (optional)
- `EXPO_PUBLIC_PINATA_JWT` – Pinata JWT used by `scripts/pinata-upload.ts` to pin assets (optional)

These values are read at build time and cannot be changed from the UI.

### Secure Key Management

Store sensitive values such as `ADMIN_WALLET_ADDRESS` and `NEAR_RPC_URL` in a
dedicated secrets manager (e.g., AWS Secrets Manager, Hashicorp Vault). Inject
them as environment variables at runtime; the app will throw on startup if
required keys are missing. The OrderPayment factory address is managed via the
admin dashboard. Avoid
committing secrets to source control. See
[`docs/secure-key-management.md`](docs/secure-key-management.md) for
additional guidance.

### Wallet Allowlist & Waku Bootstrap

Admin privileges are controlled by a list of wallet addresses stored in the
on-chain settings contract. Use the **Admin → Settings** screen or
`SettingsAgent.setAdmins()` to add or remove addresses. Only wallets in this
allowlist can manage users, products or other system settings.

The app connects to the peer‑to‑peer network through a built‑in list of Waku
bootstrap nodes. Developers can override this by setting
`EXPO_PUBLIC_WAKU_BOOTSTRAP` (for example in a `.env` file) with a
comma‑separated list of multiaddrs. Providing an empty value disables Waku
connectivity entirely.

### NEAR Smart Contracts

Smart contracts written in Rust live in `contracts/marketplace`. The helper scripts in
`scripts/` build with `near-sdk` tooling and deploy via commands compatible with `near-cli`.

Compile the contract with:

```sh
yarn contract:build
```

Deploy to a NEAR account by providing the account ID and private key:

```sh
yarn contract:deploy --account-id <account> --private-key <ed25519:...>
```

The script uploads the WASM, initializes the contract, and writes the account ID to
`constants/nearAddresses.json`. Start the Expo app normally with `yarn dev`.

### Credit Card Checkout

Storing a MoonPay publishable key in settings populates
`useAppInfo().fiatKey` and enables the `MoonPayModal` component for credit card
purchases. Without this key the MoonPay UI is hidden. Pass the wallet address,
coin and USD amount to display the widget in a modal and pre-fill the fiat
amount.


Some dependencies rely on Node.js globals like `Buffer`, `process`, and
`crypto.subtle`. Platform-specific polyfills (`polyfills.native.ts` and
`polyfills.web.ts`) provide these shims and **must only be imported once** from
the app entry point (`index.ts`). Importing polyfills elsewhere can lead to
inconsistent execution environments.

The native polyfill also pulls in `react-native-get-random-values` and
`expo-standard-web-crypto` so `crypto.getRandomValues` and `crypto.subtle` are
available globally. Both variants expose a synchronous SHA-512 implementation
for `@noble/ed25519` so key generation works in every environment.

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

Settings, users, products and orders are now managed through NEAR-based
services rather than Waku. Each domain has a small agent that reads and writes
state via its corresponding NEAR contract or service, keeping a local in-memory cache for
fast access.

Waku is only used for lightweight messaging such as chat and notification
payloads. Room keys used to encrypt chats are cached in an LRU map to keep
memory usage bounded, and encryption/decryption helpers now throw if a key
cannot be derived instead of returning plaintext.

### Web Notes

Fast Refresh can cause issues with Expo Router when running in the browser.
Disable it by setting `fastRefresh: false` in your web configuration.
The Waku chat integration is also not available on the web; the
`WakuContext.web.tsx` file provides a stub so the rest of the app can build
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

After exporting, serve `dist/` with any static host.

### IPFS Deployment Guide

Use the IPFS-friendly Vite build to create static assets with relative paths so
the app works from any gateway.

1. **Build**

   ```sh
   yarn web:release
   ```

2. **Preview locally**

   ```sh
   yarn web:preview
   ```

   Then open `http://localhost:4173/` and navigate within the app (no deep links).

3. **Upload to IPFS**

   ```sh
   ipfs add -r dist
   ```

   Pin the returned CID using your pinning service (e.g., Pinata) to publish it.

#### Pin `dist/` Checklist

1. `yarn web:release`
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

Run the app and build artifacts inside containers for reproducibility:

```sh
# start the Expo development server
yarn docker:dev

# produce a deterministic web build in ./dist
yarn docker:build:web

# preview the build locally
yarn docker:preview
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

The project uses MoonPay for purchasing crypto with a credit card. Configure the key via **Admin → Settings** or the `SettingsAgent` CLI. To accept Apple Pay directly in the app, install the Expo Stripe payments package and configure your merchant identifier.

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
All data is handled in-memory, synchronized over Waku, and persisted to NEAR when necessary; no local database is used.

## License

This project is proprietary and not open source. All rights reserved.
See [LICENSE](LICENSE) for details.

***End of Document***
