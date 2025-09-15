# Cache Contract

Defines the public interface for cache consumers and diff publishers.

## Warm-Start Hydration
On boot the cache hydrates from two sources:

1. **NEAR Lake snapshots** – the S3-backed bucket provides encrypted snapshots for the latest known revisions. These snapshots seed the cache so that the app can start offline with locally decrypted data.
2. **Waku message history** – once the snapshots are applied, the cache replays the Waku Store history to reconcile any diffs that landed after the snapshot.

Each history entry includes a stable `id`, a monotonically increasing `rev`, and the full object value.

## Real‑time Diff Messages
After hydration, updates are sent as diffs describing mutations to an entry. These diff messages share the same `id` and `version` sequencing as history entries.

## API Reference

### `getById(id)`
Retrieves an entry from the cache by its unique identifier.

- **Parameters**
  - `id` (`string`): cache key to look up.
- **Returns**: `Promise<T | null>` resolving to the cached value or `null` if missing.
- **Errors**:
  - `{ code: 'E_STALE_DATA' }` when revisions conflict.
  - `{ code: 'E_SYNC_LAG' }` when live diffs are more than 3 seconds behind the latest timestamp.

### `subscribe(filter)`
Subscribes to real‑time diff messages.

- **Parameters**
  - `filter` (`(id: string, value: T | undefined) => boolean`): predicate invoked for each update before notifying the subscriber.
- **Returns**: `() => void` unsubscribe function.
- **Events**: receives messages matching `cacheDiffMessageSchema`.

### `{cache.synced}` event
Emitted once the message history stream finishes and the cache is up to date.

- **Payload**: `{ id: string }` for the cache namespace that synced.

## Error Handling

### `E_STALE_DATA`
Thrown when a local snapshot hash differs from the authoritative hash or when live revisions arrive out of order.

```json
{
  "code": "E_STALE_DATA",
  "expected": "<expected hash>",
  "actual": "<actual hash>"
}
```

Consumers should discard the snapshot and rehydrate from message history when this error is encountered.

### `E_SYNC_LAG`
Emitted when the cache observes that incoming live diffs are more than 3 seconds behind their event timestamps. Consumers should treat the cache as read-only until a fresh diff arrives.

```json
{
  "code": "E_SYNC_LAG",
  "lagMs": 4200
}
```

## Observability

- `cache_hydration_ms` histogram captures boot hydration time.
- `cache_hit_ratio` gauge reports the warm cache hit rate.
- `cache_sync_lag_ms` gauge tracks the measured lag between diff timestamps and apply time, with `cache_sync_lag_alert_total` incremented whenever lag exceeds 3 seconds.
