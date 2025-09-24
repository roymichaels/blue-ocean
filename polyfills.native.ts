import 'react-native-url-polyfill/auto';

import {
  ensureEd25519SyncHash,
  ensureNodeLikeGlobals,
  ensureTslibDefault,
  type GlobalLike,
} from './polyfills/shared';
import { debugLog } from './utils/logger';

try {
  // MUST be require() on native
  require('react-native-get-random-values');
  // web-crypto polyfill for RN only
  require('expo-standard-web-crypto');
} catch (err) {
  debugLog('❌ Native polyfills load failed:', err);
}

ensureEd25519SyncHash();
ensureNodeLikeGlobals(globalThis as unknown as GlobalLike);

ensureTslibDefault('tslib/modules/index.js', {
  onError: (err) => debugLog('❌ tslib polyfill failed (native):', err),
});
ensureTslibDefault('tslib', {
  onError: (err) => debugLog('❌ tslib polyfill failed (native):', err),
});
