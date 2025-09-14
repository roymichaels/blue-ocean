# Cache Invalidation

Guidelines for keeping cache entries fresh across peers.

## When to Invalidate

The cache persists snapshots locally so the app can start in an offline-first mode. Invalidate a record when:

- `getById` throws `E_STALE_DATA` indicating a hash mismatch.
- A newer `version` or `updatedAt` timestamp is detected from a message.
- The entry has been explicitly revoked or deleted by an admin event.

## Handling `E_STALE_DATA`

```ts
try {
  const value = await cache.getById(id);
} catch (err) {
  if (err.code === 'E_STALE_DATA') {
    // Drop the persisted snapshot and rehydrate from message history
    await cache.hydrate(id);
  }
}
```

## Manual Busting

If an entry becomes invalid due to business rules or a soft delete, remove it from the local store:

```ts
await persistentStore.remove(id);
```

On the next subscription update the cache will rehydrate the item if it still exists remotely.

## Timestamp-Based TTL

For data that should expire, compare the `updatedAt` timestamp to a locally derived threshold. Always convert the ISO value into the user's locale to avoid timezone drift:

```ts
const expiresAt = new Date(entry.updatedAt);
if (expiresAt.toLocaleString() < new Date().toLocaleString()) {
  await persistentStore.remove(entry.id);
}
```

## Offline-First Considerations

All invalidation steps should operate on the persisted snapshot so that stale records are removed even when the device is offline. Localized timestamps ensure that comparisons work consistently regardless of user locale.

