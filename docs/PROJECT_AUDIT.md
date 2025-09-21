# Project Audit

## Bundle size summary
- **Build command**: `yarn build:web`
- **Output analyzed**: `dist/bundle-report.json`
- **Total JavaScript**: 520.04 KB raw / **148.96 KB gzip**
- Largest bundle: `_expo/static/js/web/index-1327112a795b7ca56b5dae685278add1.js` → 485.47 KB raw / 135.74 KB gzip (core app shell + providers)
- Supporting bundles are per-screen lazy chunks ranging between 1.01–3.92 KB gzip.

## Dependency inventory
### Runtime
- `expo@54.0.8`
- `react@19.1.0` (aliased to `preact/compat` on web builds)
- `react-dom@19.1.0` (aliased to `preact/compat` on web builds)
- `react-native@0.81.4`
- `react-native-web@~0.21.1` (kept for platform parity, but web export aliases to `react-native-web-lite`)
- `preact@10.27.2`
- `react-native-web-lite@1.112.4`

### Tooling / dev
- TypeScript 5.9.2, ESLint 8.57, Prettier 3.3
- Jest 29.7 with `ts-jest` preset and `jest-expo`
- Testing Library for React Native + Jest Native matchers
- Metro config overrides for aliasing, inline requires, and aggressive terser options

## Architecture map
```
index.js           → src/platformEntry.* bootstrap (Expo native vs AppRegistry web)
App.tsx            → Suspense + lazy tab navigator shell
└─ application/
   ├─ providers/   Theme, app mode, commerce client context
   └─ error/       ErrorBoundary with resettable fallback
└─ ui/
   ├─ screens/     Feature screens (Home, Search, Messages, Orders, Profile)
   ├─ components/  Reusable UI primitives (cards, skeletons, chips, etc.)
   ├─ layout/      Screen wrapper
   └─ theme/       Theme provider + tokens
└─ logic/
   └─ hooks/       Resource hooks (feed/search/orders/messages/profile)
└─ data/
   ├─ commerce/    Domain types, mock data/client, network client stub
   └─ adapters/    (future expansion point)
```

Data flow stays one-directional: **UI** consumes hooks from **logic**, hooks call client methods from **data**, and providers manage configuration + mode switching.

## Optimization highlights
- Removed Expo Router, React Navigation, Safe Area Context, Gesture Handler, AsyncStorage, and SVG packages.
- Replaced the router with a minimalist tab state machine plus `React.lazy` + Suspense for per-tab code splitting.
- Added platform-specific bootstrap: Expo registration on native, direct `AppRegistry` on web to avoid bundling Expo runtime.
- Metro aliases web builds to `preact/compat` + `react-native-web-lite`, cutting ~35% from the core bundle.
- Enabled aggressive Metro minifier settings (inline requires, drop console/debugger, toplevel mangle, pure getters).
- Simplified theming, icons (emoji), and mock data to avoid heavy assets.
- Bundle audit script (`scripts/report-bundle.js`) now scans recursively and records gzip sizes for reporting.

## Quality gates
- Linting: `yarn lint`
- Type safety: `yarn typecheck`
- Tests: `yarn test`
- Bundle verification: `yarn build:web`

All checks pass on the current tree, and the gzip target (<150 KB) is satisfied with 1.04 KB of headroom.
