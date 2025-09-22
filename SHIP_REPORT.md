# Ship Report

## Release snapshot
- **Bundle target**: ✅ 148.96 KB gzip (520.04 KB raw) across 8 JS chunks (`dist/bundle-report.json`).
- **Core runtime**: Expo 54, React 19 (web alias to Preact), React Native 0.81, react-native-web-lite for web shell.
- **Entry strategy**: Platform-specific bootstrap (Expo register on native, direct `AppRegistry` on web) with lazy tab screens.
- **Native plugins trimmed**: Removed expo-audio, expo-video, expo-font, expo-secure-store, and expo-web-browser. Preview builds now rely on pure JS fallbacks so no extra native modules are linked.

## Performance hardening
- Hermes runtime remains enabled on iOS/Android via Expo SDK 54 defaults; `app.json` now explicitly enables Proguard and resource shrinking for Android release builds.
- Metro minifier tuned for aggressive compression (inline requires, drop console/debugger, toplevel mangling, pure getters).
- Web builds alias React/React DOM to Preact and React Native Web to react-native-web-lite.
- Tab screens lazy-loaded via `React.lazy` + Suspense skeleton fallbacks.
- Lists rendered with `FlatList`/`SectionList`; mock data kept to small curated sets.
- Local storage interactions guarded with graceful fallbacks and cleanup to avoid runtime errors.

## UX map
- **Home** – Curated hero store, quick filters, trending products, and featured stores list.
- **Search** – Debounced query input, quick filter chips, result sections for stores and products, empty/error states.
- **Messages** – Recent conversations with unread indicators and timestamps.
- **Orders** – Order history with status pills, ETA, and receipt summaries.
- **Profile** – Account snapshot plus mock/live mode toggle, support links placeholder.

All screens share a unified theme provider (light/dark), emoji icon tab bar, skeleton loading states, and accessible touch targets.

## Testing & quality gates
- `yarn lint`
- `yarn typecheck`
- `yarn test`
- `yarn build:web`

All commands pass on the shipping commit.

## Security & resilience checklist
- ✅ Error boundary catches render failures and offers manual retry.
- ✅ Network client factory centralizes live/mock switching and sanitizes base URL input.
- ✅ No direct secret storage; runtime configuration pulled from `app.json` extras or environment variables and cached through a lightweight local storage shim instead of native keychain bindings.
- ✅ Local storage access wrapped in try/catch with in-memory fallback to avoid crashes in restricted contexts.
- ✅ Dependency surface minimized—no crypto, wallet, or router packages included in the lightweight build.

## Deployment commands
- **Install**: `yarn install`
- **Dev (mock)**: `yarn dev` (defaults to mock mode)
- **Dev (live)**: `yarn dev:live` with `EXPO_PUBLIC_API_URL` defined
- **Android/iOS**: `yarn android` / `yarn ios`
- **Web export**: `yarn build:web` (produces `dist/` + bundle report)
- **CI helper**: `yarn ci` (lint + typecheck + test)
