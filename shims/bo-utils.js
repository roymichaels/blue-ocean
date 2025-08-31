// Minimal web-safe shims for @blue-ocean/utils during Expo Web development.
// Avoids bundling TS sources from the linked package.

exports.requireStoreId = function requireStoreId(storeId) {
  return storeId || 'default';
};

exports.getFeeBps = function getFeeBps() {
  const raw = (typeof process !== 'undefined' && process.env && process.env.FEE_BPS) || '';
  const n = Number(raw);
  return Number.isFinite(n) ? n : 100; // default 1%
};

exports.topicFor = function topicFor(_network, storeId, type) {
  const sid = exports.requireStoreId(storeId);
  return `/blue-ocean/${sid}/${type}/1`;
};

