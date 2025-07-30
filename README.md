# The Congress

This Expo project uses React Native with the Expo Router.

## Setup

Run `yarn install` to populate `node_modules`.

```sh
yarn install
```


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

Settings, users, products and orders are synchronized between peers over the Waku network. When any of these records change locally, call the appropriate `sendWaku...Update` function to broadcast the update. Add the matching `useWaku...Sync` hook (for example `useWakuSettingsSync`) in your root layout so that your local memory store receives updates from other peers.

The sync hooks only start when `EXPO_PUBLIC_USE_WAKU=true`. Disable Waku to keep the data purely local and skip peer synchronization.

### Web Notes

Fast Refresh can cause issues with Expo Router when running in the browser.
Disable it by setting `fastRefresh: false` in your web configuration.
The Waku chat integration is also not available on the web; the
`useWakuClient.web.ts` file provides a stub so the rest of the app can build
without the Waku SDK.

## Environment Variables

When you launch the app for the first time an onboarding wizard prompts for the
secrets it needs (JWT, chat and Waku keys, Pinata credentials and admin login).
Since there is no persistent database these values live only in memory.
Restart the app to clear them and run onboarding again.

The following environment variables remain optional and can be provided through
your shell:

* `EXPO_PUBLIC_SETTINGS_API_URL` – endpoint for remote tenant settings
* `EXPO_PUBLIC_USE_WAKU` – set to `true` to enable Waku features
* `EXPO_PUBLIC_DEBUG_LOGS` – enable verbose logging
* `EXPO_PUBLIC_MATRIX_SERVER` – Matrix server URL (future use)
* `EXPO_PUBLIC_TENANT` – identifier for the white‑label tenant used for Waku topics

## Seeding Sample Data

Populate the in-memory store with fake users, products, orders and tenant settings:

```sh
yarn seed
```

## Running the Project

Start the Expo development server with:

```sh
yarn dev
```

`yarn start` works as an alias of `yarn dev`.

### Building the Web PWA

Export the web build using Expo once onboarding is complete:

```sh
yarn build:web
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

Ensure all dependencies are installed using `yarn install` before running the tests.

## License

This project is proprietary and not open source. All rights reserved.
See [LICENSE](LICENSE) for details.

***End of Document***
