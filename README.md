# The Congress

This Expo project uses React Native with the Expo Router.

## Setup

Run `yarn install` to populate `node_modules`:

```sh
yarn install
```

If dependencies need patching, run `patch-package` after installation:

```sh
yarn postinstall
```


Some dependencies rely on Node.js globals like `Buffer` and `URL`. The project
includes a `polyfills.js` file to provide these when running on React Native or
the web. The polyfill is automatically imported from `index.ts`.
The project also uses `expo-standard-web-crypto` to polyfill the Web Crypto API,
so ensure it's installed as a dependency.

### Session Persistence

User sessions are stored using `@react-native-async-storage/async-storage`. On
native platforms this uses the native AsyncStorage implementation and falls back
to `window.localStorage` when running on the web. This ensures Supabase auth
state persists across reloads on every platform.

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```sh
cp .env.example .env
# then edit .env and provide your keys
```

The file includes a `EXPO_PUBLIC_CHAT_SECRET` variable used to derive
encryption keys for chat messages. Set it to any random string but make sure
the same value is used for all clients so they can decrypt messages.

## Supabase Migrations

Before running the Expo app, apply the SQL files in `supabase/migrations` so
tables like `settings` and `price_tier_rules` are created.

1. Install the Supabase CLI if you don't have it:
   ```sh
   npm install -g supabase
   ```
2. Log in to your account:
   ```sh
   supabase login
   ```
3. From the project root, push the migrations:
   ```sh
   npx supabase db push
   ```


## Running the Project

Start the Expo development server with:

```sh
yarn dev
```

`yarn start` works as an alias of `yarn dev`.


***End of Document***
