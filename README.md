# The Congress

This Expo project uses React Native with the Expo Router. It requires a polyfill for the Node `crypto` module. A compatible implementation such as **react-native-crypto** must be installed.

## Setup

Install dependencies using `pnpm`:

```sh
pnpm install
```

### Crypto polyfill

To support packages that depend on Node's `crypto` API, the project aliases `crypto` to `react-native-crypto` in `metro.config.js`. The polyfill must be loaded before other modules. This is already imported in `app/_layout.tsx`.

If you add new entry files, ensure the polyfill is imported before other code:

```ts
import 'react-native-crypto';
```

### Buffer polyfill

React Native 0.79 no longer provides the Node.js `Buffer` global. Some
dependencies (like `react-native-crypto`) expect it to exist. The project loads
the polyfill in `app/_layout.tsx`:

```ts
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  (global as any).Buffer = Buffer;
}
```

If you create a new entry file, make sure to include this snippet before other
code.

***End of Document***
