# The Congress

This Expo project uses React Native with the Expo Router.

## Setup

Run `yarn install` to populate `node_modules`. ElectricSQL is required for web support, so install it as a development dependency:

```sh
yarn install
```

All data is stored locally; no external services are required.


Some dependencies rely on Node.js globals like `Buffer` and `URL`. The project
includes a `polyfills.js` file to provide these when running on React Native or
the web. The polyfill is automatically imported from `index.ts`.
The project also uses `expo-standard-web-crypto` to polyfill the Web Crypto API,
so ensure it's installed as a dependency.

### Hot Reloading

Metro now resolves `@expo/metro-runtime/src/HMRClient.ts` to the
local `HMRClient.ts` wrapper. TypeScript and webpack also alias the path
without the extension for compatibility. This module applies the necessary polyfills before
loading Metro's runtime so hot reloading works reliably on every platform.

Metro also maps `react-native/Libraries/Utilities/HMRClient` to a stub
`EmptyHMRClient.ts` with no-op methods so bundling succeeds even when the native
implementation isn't available.

### Session Persistence

User sessions are stored using `@react-native-async-storage/async-storage`.
On native platforms this uses the native AsyncStorage implementation and falls
back to `window.localStorage` when running on the web. This ensures
authentication state persists across reloads on every platform.

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

## ElectricSQL on the Web

`ensureDatabase` from `lib/sqlite.ts` checks whether any tables already exist. If not, it reads the SQL files in `sqlite/migrations` and creates the schema on the first run. When the app runs in the browser, ElectricSQL's **browser driver** (`electric-sql/browser`) provisions an IndexedDB-backed database and applies the same schema automatically. Once the tables are created the library begins syncing with the backend automatically.

If you modify any migration file you need to regenerate the ElectricSQL schema so the web build picks up the changes:

```sh
npx electric-sql migrate
```

The project depends on the `electric-sql` package, and this command will generate the updated schema files under the `electric/` directory which `ensureDatabase` relies on when running on the web.

After migrating, run the generator to produce the TypeScript schema used by the web build:

```sh
npx electric-sql generate
```

The resulting `electric/schema.ts` file is re-exported from `sqlite/migrations/index.ts`.

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
