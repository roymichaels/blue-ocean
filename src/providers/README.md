# Provider Composition

`AppProviders.tsx` composes the core React context providers for the application. Its inline comment documents the required ordering; this README summarizes those invariants for contributors.

## Order

1. **ErrorBoundary** – captures errors from all descendants.
2. **ThemeProvider** – applies theming before any UI renders.
3. **LanguageProvider** – sets up i18n and text direction.
4. **CheckedQueryClientProvider** – enforces a single React Query client.
5. **WalletProvider** – supplies wallet context for network layers.
6. **WakuProvider** – depends on the wallet and query client.

## Invariants

- `ErrorBoundary` must wrap everything to surface runtime errors.
- `ThemeProvider` and `LanguageProvider` must appear before any component that uses theming or i18n.
- `CheckedQueryClientProvider` must wrap providers that rely on React Query, including the `WalletProvider`.
- `WalletProvider` supplies wallet state for network layers and comes before providers that require it, such as `WakuProvider`.
- `WakuProvider` depends on both the wallet and query client and therefore must be last.

See [AppProviders.tsx](./AppProviders.tsx) for the authoritative inline comment.
