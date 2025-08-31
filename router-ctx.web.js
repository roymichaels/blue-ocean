// Local override for expo-router _ctx.web.js on Windows to avoid backslash
// path issues when Babel computes a relative app root. This ensures webpack
// can statically analyze routes under the ./app directory.
// Note: This mirrors the intent of expo-router’s internal context but keeps
// things simple for development.

// Include all .ts/.tsx/.js/.jsx files under ./app; expo-router will ignore
// non-route files at runtime.
export const ctx = require.context('./app', true, /\.[tj]sx?$/);

