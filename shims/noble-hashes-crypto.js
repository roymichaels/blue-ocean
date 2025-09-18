// Shim to map deprecated subpath '@noble/hashes/crypto.js' to the public export
// exposed by the package. This avoids Metro package-exports warnings.
import * as m from '@noble/hashes/crypto';
export default m;
export * from '@noble/hashes/crypto';
