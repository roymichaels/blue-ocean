# The Congress

This Expo project uses React Native with the Expo Router.

## Setup

Run `yarn install` to populate `node_modules`. All data is stored locally; no external services are required.

```sh
yarn install
```

SQLite migrations are executed by `./scripts/init-sqlite-db.sh` and also run automatically before `yarn dev` via the `predev` script.

All data is stored locally; no external services are required.


Some dependencies rely on Node.js globals like `Buffer` and `URL`. The project
includes a `polyfills.js` file to provide these when running on React Native or
the web. The polyfill is automatically imported from `index.ts`.
The project also uses `expo-standard-web-crypto` to polyfill the Web Crypto API,
so ensure it's installed as a dependency.

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

### Web Notes

Fast Refresh can cause issues with Expo Router when running in the browser.
Disable it by setting `fastRefresh: false` in your web configuration.
The Waku chat integration is also not available on the web; the
`useWakuClient.web.ts` file provides a stub so the rest of the app can build
without the Waku SDK.
The web build also fetches the initial SQLite migration over HTTP so it doesn't
need `expo-file-system`.

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```sh
cp .env.example .env
# then edit .env and provide your keys
```

The file includes a `EXPO_PUBLIC_CHAT_SECRET` variable used to derive
encryption keys for chat messages. Set it to any random string but make sure
the same value is used for all clients so they can decrypt messages.

`EXPO_PUBLIC_TENANT` specifies which tenant's branding to load from the
`tenant_settings` table. Example values are `thecongress` or `thebull`.

Logos and other uploaded images are stored on IPFS via Pinata. Set
`EXPO_PUBLIC_PINATA_JWT` (or API key/secret) in your `.env` file so uploads can
succeed.

## SQLite Migrations

Create a local SQLite database:

```sh
./scripts/init-sqlite-db.sh sqlite/blue-ocean.db
```

This applies the SQL files in `sqlite/migrations` and writes the database to
`sqlite/blue-ocean.db`.

When you run `yarn dev`, a `predev` script automatically executes the migrations and creates the database if it does not already exist.


## Seeding Sample Data

After applying the migrations you can populate the local database with fake
users, products, orders and tenant settings.

```sh
yarn seed
```

The `seed.js` script defaults to `sqlite/blue-ocean.db`. Set `DB_PATH` to use a
different location.

## Database Backup and Restore

Create a SQL dump of the database with:

```sh
./scripts/backup-db.sh sqlite/blue-ocean.db dump.sql
```

Restore the database from a dump:

```sh
./scripts/restore-db.sh sqlite/blue-ocean.db dump.sql
```

These scripts assume a dump file named `dump.sql`, but the repository no longer
tracks one. Run `backup-db.sh` to generate the dump before restoring or specify
your own dump file path.

## Running the Project

Start the Expo development server with:

```sh
yarn dev
```

`yarn start` works as an alias of `yarn dev`.

## Multi-Tenant Builds

Environment files are provided for each tenant under the project root. Build the
web PWA for a specific tenant using the scripts below. The output is placed in
`dist/{tenant}` for easy deployment.

Each build sets `EXPO_PUBLIC_TENANT` so the app loads the matching row from
`tenant_settings`.

Before the export step runs, the `update:appjson` script updates `app.json`
using the current `EXPO_PUBLIC_APP_NAME` and `EXPO_PUBLIC_TENANT` values. This
ensures each build gets its own application name and slug.

```sh
# Build The Congress
yarn build:web:thecongress

# Build The Bull
yarn build:web:thebull
```

Matching NGINX configs for each tenant are located in `nginx/` and assume the
exported files are served from `/var/www/{tenant}/dist`.

## Database Backup

The project includes helper scripts to encrypt the `blue-ocean.db` SQLite file
and store it on Pinata. Set your Pinata credentials in `.env` and provide a
passphrase when running the scripts.

### Backup the database

```sh
node scripts/backup-db.js mySecretPassphrase
```

### Restore the latest backup

```sh
node scripts/restore-db.js mySecretPassphrase
```


## License

This project is proprietary and not open source. All rights reserved.
See [LICENSE](LICENSE) for details.

***End of Document***
