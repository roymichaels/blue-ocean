# Performance Budgets

The web build is limited to **500KB** of gzipped JavaScript across all `dist/**/index.js` bundles. The `size-check` script runs automatically after `yarn build:web` and fails the build when this limit is exceeded.

## Keeping bundles small
- Use dynamic imports or code splitting for rarely used routes and features.
- Prefer tree-shakable libraries and remove unused dependencies.
- Avoid large polyfills; rely on modern browser APIs when possible.
- Defer loading of heavy assets until they are needed.
- Analyze bundles with tools like `source-map-explorer` to track growth over time.
