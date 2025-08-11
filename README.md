# The Congress

This Expo project uses React Native with the Expo Router.

## Setup

1. **Install dependencies**

   ```sh
   yarn install
   ```

2. **Configure secrets**

   Generate a Waku key so peers can decrypt your messages:

   ```sh
   export EXPO_PUBLIC_WAKU_SECRET=$(openssl rand -hex 32)
   ```

3. **Start the Expo project**

   - **Web**: `yarn start`
   - **Mobile**: `yarn dev`

4. **Connect a TON wallet**

   When the app loads, tap the wallet button to open the TonConnect modal. Scan the QR code with a wallet like Tonkeeper or use an injected extension to link your account.

All data is ephemeral and synchronized between peers over Waku; no external services are required. All state is held in memory and hydrated from the Waku message history on boot. No database setup or SQL migrations are required, and all prior SQLite migration files have been removed from this repository.

### Environment Variables

The app reads several secrets from the environment to encrypt peer-to-peer messages and sign tokens:

- `EXPO_PUBLIC_WAKU_SECRET` – AES key used for Waku message encryption. If not provided one is generated on first launch.
- `EXPO_PUBLIC_JWT_SECRET` – secret for signing JWT tokens.
- `EXPO_PUBLIC_CHAT_SECRET` – secret used by the chat service.

The test suite defines these variables with the following values in `tests/setupEnv.ts`:

```sh
export EXPO_PUBLIC_WAKU_SECRET=test_waku_secret
export EXPO_PUBLIC_JWT_SECRET=test_jwt_secret
export EXPO_PUBLIC_CHAT_SECRET=test_chat_secret
```

Set them in your shell or enter them in the system settings screen after the app starts. You can modify them later from that screen at any time.

A Waku secret is generated automatically on first launch and peer-to-peer sync is always enabled.

### Onboarding

Start the app once the dependencies are installed. The first screen prompts you
to sign up or log in. After authentication you'll be asked for a few setup
details:

- **App name** – required to configure your local instance.
- **Pinata keys** – optional values that enable media uploads to IPFS via
  Pinata.
- **MoonPay key** – optional value enabling credit card purchases through the
  MoonPay widget.
- A JWT secret is generated automatically on first launch and stored locally.

After saving the form the configuration is stored locally and subsequent
launches skip this screen.

If you provided Pinata credentials the `PinataService` will upload any product
images or videos to IPFS automatically. Without these keys the app simply keeps
the local file URIs.

### Environment Variables

The app also checks `process.env` for known configuration keys when it starts.
If a variable is defined it **overrides** the value stored locally. This allows
secrets to be injected at runtime without editing the on-device config. The
recognized keys include:

- `EXPO_PUBLIC_JWT_SECRET`
- `EXPO_PUBLIC_CHAT_SECRET`
- `EXPO_PUBLIC_WAKU_SECRET`
- `EXPO_PUBLIC_ADMIN_USERNAME`
- `EXPO_PUBLIC_PINATA_JWT`
- `EXPO_PUBLIC_PINATA_API_KEY`
- `EXPO_PUBLIC_PINATA_SECRET_API_KEY`
- `EXPO_PUBLIC_TENANT`
- `EXPO_PUBLIC_DEBUG_LOGS`
- `MOONPAY_KEY`
- `APP_NAME`
- `PRIMARY_COLOR`
- `APP_LOGO`

### Credit Card Checkout

Providing a MoonPay key enables the `MoonPayModal` component for credit card
purchases. Pass the wallet address, coin and USD amount to display the widget in
a modal and pre-fill the fiat amount.


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
payloads.

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

Export the web build using Expo once onboarding is complete:

```sh
yarn build:web
```

The export step copies `public/tonconnect-manifest.json` into the `dist` folder
so wallets can load it from `/tonconnect-manifest.json` in production. After
deploying the static build, verify the manifest is accessible:

```sh
curl https://<your-site>/tonconnect-manifest.json
```

## Troubleshooting

### Content Security Policy

If the web app fails to load because of CSP errors (for example `Refused to connect to 'ws://localhost:19000'` or complaints about `unsafe-eval`), ensure your `Content-Security-Policy` header permits the Expo development endpoints and WebSocket connections. The webpack configuration uses `devtool: 'source-map'` to avoid `eval`, but strict policies may still require allowing `blob:` URLs and `ws://` origins.

### Bundler Aliases

Module resolution relies on custom aliases defined in `metro.config.js` and `webpack.config.js`. If the bundler cannot find modules like `@expo/metro-runtime/src/HMRClient` or `@noble/hashes`, verify those aliases exist and clear caches with `expo start -c`.

## Docker

Use Docker to run the project in a reproducible environment. Build the image
and start the Expo server with a Waku secret provided via the environment:

```sh
docker build -t blue-ocean .
docker run -e EXPO_PUBLIC_WAKU_SECRET=$(openssl rand -hex 32) \
  -p 19000-19002:19000-19002 blue-ocean
```

For hot reloading and easier development you can also use Docker Compose:

```sh
EXPO_PUBLIC_WAKU_SECRET=$(openssl rand -hex 32) docker compose up
```

## Tests

Run the test suite with:

```sh
yarn test
```

Run `yarn install` before executing `yarn test` so Jest and other dependencies are present.

## Apple Pay Integration

The project uses MoonPay for purchasing crypto with a credit card. To accept Apple Pay directly in the app, install the Expo Stripe payments package and configure your merchant identifier.

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


## License

This project is proprietary and not open source. All rights reserved.
See [LICENSE](LICENSE) for details.

***End of Document***
