# Quickstart

Get up and running with the cache API.

## Load an Entry with `getById`

```ts
import { cache } from '@blue-ocean/cache';

async function bootstrap() {
  const product = await cache.getById('product:1');
  if (product) {
    // Convert timestamps for the current locale
    console.log(new Date(product.updatedAt).toLocaleString());
  }
}
```

`getById` resolves from the offline snapshot first so the UI can render immediately even without a network connection.

## Listen for Updates with `subscribe`

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const unsubscribe = cache.subscribe({ type: 'product' }, async diff => {
  // Merge diff into local model
  const next = applyDiff(diff);
  // Persist the update for offline-first usage
  await AsyncStorage.setItem(`product:${next.id}`, JSON.stringify(next));
  // Work with localized timestamps
  console.log(new Date(next.updatedAt).toLocaleString());
});
```

Remember to call `unsubscribe()` when the listener is no longer needed.

## Offline-First & Timestamp Handling

Persisting snapshots (e.g. with `AsyncStorage`) allows the cache to survive restarts and offline periods. Always convert ISO timestamp strings with `toLocaleString` or `Intl.DateTimeFormat` so users see values in their local timezone.

