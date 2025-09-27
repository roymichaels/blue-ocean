# Dependency Maintenance Log

This log captures the most recent cleanup and install attempt for the monorepo.

## 2025-09-27 Cleanup
- Searched for build artifacts (`.expo`, `dist`, `expo-export`) and cache directories (`.turbo`, `**/.cache`), but none were present in the repository.
- Verified that no `node_modules` directories were checked in or left over from previous installs.

## 2025-09-27 Install Attempt
- Ran `npm install` to align with the updated package manager choice.
- Installation failed because npm does not support the `workspace:*` protocol used by the monorepo. The resolver emitted an `EUNSUPPORTEDPROTOCOL` error before it could even reach the missing `@blue-ocean/sdk-near` dependency.

## Recommended Follow-Up
1. Ensure the `@blue-ocean/sdk-near` package is available (publish to the registry or add it as a local workspace).
2. Re-run `npm install` once the workspace dependencies are refactored to be compatible with npm or replaced with published versions.
3. Confirm that any newly generated lockfile (`package-lock.json`) is committed after a successful install.
