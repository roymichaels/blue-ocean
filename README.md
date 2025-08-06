# The Congress

This Expo project uses React Native with the Expo Router.

## Setup

Run `yarn install` to populate `node_modules`. All data is ephemeral and can be synchronized between peers over Waku when enabled; no external services are required.

```sh
yarn install
```

All state is held in memory and hydrated from the Waku message history on boot. No database setup or SQL migrations are required, and all prior SQLite migration files have been removed from this repository.

### Environment Variables

The app reads several secrets from the environment to encrypt peer-to-peer messages and sign tokens:

- `EXPO_PUBLIC_WAKU_SECRET` – AES key used for Waku message encryption.
- `EXPO_PUBLIC_JWT_SECRET` – secret for signing JWT tokens.
- `EXPO_PUBLIC_CHAT_SECRET` – secret used by the chat service.

The test suite defines these variables with the following values in `tests/setupEnv.ts`:

```sh
export EXPO_PUBLIC_WAKU_SECRET=test_waku_secret
export EXPO_PUBLIC_JWT_SECRET=test_jwt_secret
export EXPO_PUBLIC_CHAT_SECRET=test_chat_secret
```

Set them in your shell or enter them in the system settings screen after the app starts. You can modify them later from that screen at any time.

Waku synchronization is disabled until `EXPO_PUBLIC_WAKU_SECRET` is provided.
Once a secret is set, you can enable peer-to-peer sync by setting
`EXPO_PUBLIC_USE_WAKU=true`.

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
- `EXPO_PUBLIC_USE_WAKU`
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


Some dependencies rely on Node.js globals like `Buffer` and `URL`. The project
includes a `polyfills.js` file to provide these when running on React Native or
the web. The polyfill is automatically imported from `index.ts`.
The project also uses `expo-standard-web-crypto` to polyfill the Web Crypto API,
so ensure it's installed as a dependency.
The polyfill additionally provides a synchronous SHA-512 implementation for
`@noble/ed25519` so key generation works in every environment.

### Hot Reloading

Metro resolves both `@expo/metro-runtime/src/HMRClient` and
`@expo/metro-runtime/src/HMRClient.ts` to the local `HMRClient.ts` wrapper.
TypeScript and webpack use the same aliases so all tools reference the wrapper
consistently. This module applies the necessary polyfills before loading
Metro's runtime so hot reloading works reliably on every platform.

Metro also maps `react-native/Libraries/Utilities/HMRClient` to a stub
`EmptyHMRClient.ts` with no-op methods so bundling succeeds even when the native
implementation isn't available.

### Session Persistence

User sessions are stored using `@react-native-async-storage/async-storage`.
On native platforms this uses the native AsyncStorage implementation and falls
back to `window.localStorage` when running on the web. This ensures
authentication state persists across reloads on every platform.

### Peer-to-Peer Synchronization

Settings, users, products and orders are synchronized between peers over the Waku
network. Each domain is handled by a small agent that subscribes to a Waku topic
and keeps a local in-memory cache. On startup every agent replays the topic's
history so the latest state is restored. When a record changes locally, call the
appropriate `sendWaku...Update` function to broadcast the update. Each agent
listens for new messages on its topic and applies them automatically, so data
can be rehydrated from history at any time.

Agents only start when `EXPO_PUBLIC_USE_WAKU=true` and a secret is provided. Without a secret Waku remains disabled and data stays purely local.

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

## Docker

Use Docker to run the project in a reproducible environment. Build the image
and start the Expo server with:

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
