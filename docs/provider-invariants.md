# Provider Invariants

- Only a single `QueryClientProvider` should be mounted at any time. Multiple providers create separate React Query caches and can lead to inconsistent data. The `CheckedQueryClientProvider` component in [`src/providers/CheckedQueryClientProvider.tsx`](../src/providers/CheckedQueryClientProvider.tsx) enforces this during development and will throw if another provider mounts.
