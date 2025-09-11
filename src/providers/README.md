# Provider Composition

`AppProviders.tsx` composes the core React context providers for the application. Its inline comment documents the required ordering; this README summarizes those invariants for contributors.

## Order

1. **ThemeProvider** – applies theming before any UI renders.
2. **LanguageProvider** – sets up i18n and text direction.
3. **CheckedQueryClientProvider** – enforces a single React Query client.
4. **WalletProvider** – supplies wallet context for network layers.
5. **AppInfoProvider** – supplies branding and app configuration.
6. **ConfigProvider** – exposes static runtime configuration.
7. **ErrorBoundary** – captures errors from all descendants.
8. **WakuProvider** – depends on the wallet and query client.
9. **AuthProvider** – manages authentication state.
10. **AuthModalProvider** – handles auth modal display.
11. **CurrencyProvider** – stores selected currency.
12. **NotificationProvider** – listens for notifications and displays popups.

## Invariants

- `ThemeProvider` and `LanguageProvider` must appear before any component that uses theming or i18n.
- `CheckedQueryClientProvider` must wrap providers that rely on React Query, including the `WalletProvider`.
- `WalletProvider` supplies wallet state for network layers and comes before providers that require it, such as `WakuProvider`.
- `ErrorBoundary` wraps the remaining providers to surface runtime errors.

See [AppProviders.tsx](./AppProviders.tsx) for the authoritative inline comment.
