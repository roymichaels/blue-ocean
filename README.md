# Blue Ocean Expo App

An Expo + React Native experience for exploring the Blue Ocean marketplace. The app now focuses on a lightweight offline-first
mock that can flip to a live API at runtime. It launches fast, ships a polished bottom tab navigation, and keeps the bundle tiny
without sacrificing usability.

## Highlights

- **Mock + live modes** – toggle between bundled demo data and live network calls from the Profile tab. No backend is required to
  try the product and the preference persists in local storage (or an in-memory fallback on native).
- **Slim bundle** – aggressive Metro optimizations, Hermes, Prettier tree-shaking, and lean dependencies (Preact + react-native-web-lite on web) keep the gzipped web bundle under 150 KB.
- **Modern UX** – native-feeling tabs, skeletons, haptics, and responsive layouts inspired by major consumer apps.
- **Modular architecture** – UI → Logic → Data layers keep concerns isolated and testable.
- **Tooling ready** – ESLint, Prettier, TypeScript, Jest, and a one-command Docker dev environment.

## Quick start

```bash
yarn install
yarn dev            # start Expo (mock mode by default)
```

Optional helpers:

```bash
yarn dev:mock       # explicit mock mode
yarn dev:live       # start in live mode (requires EXPO_PUBLIC_API_URL)
yarn web            # Expo web dev server
yarn lint           # ESLint
yarn typecheck      # tsc --noEmit
yarn test           # Jest (jest-expo preset)
yarn build:web      # static web export + bundle report (dist/bundle-report.json)
```

## Modes

The app reads `EXPO_PUBLIC_APP_MODE` (and `extra.appMode` in `app.json`) to choose between:

- **mock** – uses curated marketplace data defined in `src/data/commerce/mockData.ts`. Perfect for demos or offline review.
- **live** – lazily creates a network client. Set `EXPO_PUBLIC_API_URL=https://your-domain/api` to point at production. Failed
  requests automatically fall back to mock responses so the UI stays usable.

You can flip modes at runtime from the **Profile → Live data mode** switch. The value persists to `localStorage` on web and falls back to an in-memory cache on native.

## Project structure

```
App.tsx                 Root component with lightweight tab navigator + lazy screens
src/application         Providers, app configuration helpers, error boundary
src/data/commerce       Data contracts + clients (mock + live wrappers)
src/logic/hooks         Hooks that connect UI to the data layer
src/ui                  Theming, primitives, screen components, layout helpers
src/platformEntry.*     Platform-specific bootstrappers (Expo native vs. direct AppRegistry on web)
scripts/report-bundle.js  Web bundle size reporter used by `yarn build:web`
```

The UI layer stays declarative and stateless, the logic layer manages data fetching, and the data layer encapsulates adapters.

## Developer experience

- **Lint** – `yarn lint` (ESLint + React Hooks rules)
- **Typecheck** – `yarn typecheck`
- **Tests** – `yarn test` (jest-expo with Testing Library)
- **Format** – Prettier config lives in `package.json` (run through your editor or `npx prettier`).
- **Docker** – build once, run anywhere:

  ```bash
  docker build -t blue-ocean .
  docker run --rm -it -p 19000-19002:19000-19002 blue-ocean
  ```

## Live API contract

When `EXPO_PUBLIC_API_URL` is defined, the app expects REST endpoints:

- `GET /feed` → `CommerceFeed`
- `GET /stores` → `Store[]`
- `GET /orders` → `Order[]`
- `GET /messages` → `MessagePreview[]`
- `GET /search?term=` → `CommerceSearchResult`

Missing or failing endpoints automatically fall back to the bundled mock client. Implementing the API later does not require UI
changes—only the data layer swaps from mock to live responses.

## Bundle reporting

`yarn build:web` exports the Expo web build using Metro, then runs `scripts/report-bundle.js`. The script prints the raw + gzip
sizes for each JavaScript asset and stores a machine-readable report at `dist/bundle-report.json` for the final audit.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_APP_MODE` | `mock` | Default mode on startup. Overridden by the persisted preference (localStorage on web, in-memory fallback on native). |
| `EXPO_PUBLIC_API_URL` | – | Optional base URL for live mode. |

You can extend `app.json` → `expo.extra` with more values and read them inside providers if you need additional configuration.

## Deployment

- **Web** – `yarn build:web` creates `dist/` with static assets and a bundle report.
- **Mobile** – Use Expo Application Services (EAS) or `expo run:android` / `expo run:ios` to create native binaries. Hermes,
  Proguard, and resource shrinking are enabled in `app.json`.

## Contributing

1. Fork and clone the repo.
2. Install dependencies with `yarn install`.
3. Make changes, add tests, and run the checks (`yarn lint && yarn typecheck && yarn test`).
4. Commit and open a PR summarizing the architecture or UX impact.
