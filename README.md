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

1. Use the Supabase CLI via `npx` (or install it using the [official instructions](https://github.com/supabase/cli#install-the-cli)) and log in:
   ```sh
   npx supabase login
   ```
2. From the project root, push the migrations:
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
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
if (Platform.OS === 'web') {
  require('react-native-url-polyfill/auto');
  if (typeof global.crypto === 'undefined') {
    global.crypto = require('crypto').webcrypto;
  }
}
```

If you create a new entry file, make sure to include this snippet before other
code.

***End of Document***
