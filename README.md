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

### Peer-to-Peer Synchronization

Settings, users, products and orders are synchronized between peers over the Waku network. When any of these records change locally, call the appropriate `sendWaku...Update` function to broadcast the update. Add the matching `useWaku...Sync` hook (for example `useWakuSettingsSync`) in your root layout so that your SQLite database receives updates from other peers.

### Web Notes

Fast Refresh can cause issues with Expo Router when running in the browser.
Disable it by setting `fastRefresh: false` in your web configuration.
The Waku chat integration is also not available on the web; the
`useWakuClient.web.ts` file provides a stub so the rest of the app can build
without the Waku SDK.
The web build also fetches the initial SQLite migration over HTTP so it doesn't
need `expo-file-system`.

## Environment Variables

When you launch the app for the first time an onboarding wizard prompts for the
secrets it needs (JWT, chat and Waku keys, Pinata credentials and admin login).
These values are stored in the local SQLite database so an `.env` file is no
longer required for them.

If you ever need to run the onboarding again, delete `sqlite/blue-ocean.db` or
run:

```sh
yarn reset-db
```

The following environment variables remain optional and can be provided through
an `.env` file or your shell:

* `EXPO_PUBLIC_TENANT` – which tenant's branding to load
* `EXPO_PUBLIC_SETTINGS_API_URL` – endpoint for remote tenant settings
* `EXPO_PUBLIC_USE_WAKU` – set to `true` to enable Waku features
* `EXPO_PUBLIC_DEBUG_LOGS` – enable verbose logging
* `EXPO_PUBLIC_MATRIX_SERVER` – Matrix server URL (future use)
* `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` – keys for push notifications

## SQLite Migrations

Create a local SQLite database:

```sh
./scripts/init-sqlite-db.sh sqlite/blue-ocean.db
```

This applies the SQL files in `sqlite/migrations` and writes the database to
`sqlite/blue-ocean.db`.

When you run `yarn dev`, a `predev` script automatically executes the migrations and creates the database if it does not already exist.

If you need to start from a clean database, run:

```sh
yarn reset-db
```

This deletes `sqlite/blue-ocean.db` and re-applies the migrations.


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

## Docker

Use Docker to run the project in a reproducible environment. Build the image
and start the Expo server with:

```sh
docker build -t blue-ocean .
docker run --env-file .env -p 19000-19002:19000-19002 blue-ocean
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
