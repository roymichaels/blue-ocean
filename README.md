# The Congress

This Expo project uses React Native with the Expo Router.

## Setup

Run `yarn install` to populate `node_modules`. All data is ephemeral and synchronized between peers over Waku; no external services are required.

```sh
yarn install
```

All state is held in memory and hydrated from the Waku message history on boot.

### Onboarding

Start the app once the dependencies are installed. On first launch you will be
prompted for a few details:

- **App name and admin credentials** – required to set up your local identity
  and admin user.
- **Pinata keys** – optional values that enable media uploads to IPFS via
  Pinata.

After saving the form your admin key pair is created locally and subsequent
launches skip this screen.

If you provided Pinata credentials the `PinataService` will upload any product
images or videos to IPFS automatically. Without these keys the app simply keeps
the local file URIs.


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
appropriate `sendWaku...Update` function to broadcast the update. The matching
`useWaku...Sync` hook (for example `useWakuSettingsSync`) listens for new
messages and applies them. All data lives in memory and can be rehydrated from
history at any time.

The sync hooks only start when `EXPO_PUBLIC_USE_WAKU=true`. Disable Waku to keep data purely local.

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
