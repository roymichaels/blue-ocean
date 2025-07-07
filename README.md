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

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```sh
cp .env.example .env
# then edit .env and provide your keys
```

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

### Buffer polyfill

React Native 0.79 no longer provides the Node.js `Buffer` global. The project
defines it in `app/_layout.tsx` so libraries relying on Buffer continue to
work:

```ts
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
if (typeof global.__filename === 'undefined') {
  // Provide an empty string to satisfy modules expecting Node's __filename
  // Adjust if a specific path is required by matrix-js-sdk
  (global as any).__filename = '';
}
if (Platform.OS === 'web') {
  require('react-native-url-polyfill/auto');
}
```

If you create a new entry file, make sure to include this snippet before other
code so the Buffer and `__filename` globals are available.

***End of Document***
