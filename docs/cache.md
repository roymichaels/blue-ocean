# Cache Contract

Defines the public interface for cache consumers and diff publishers.

## Message History Stream
History hydration delivers an array of entries. Each entry includes a stable `id`, a monotonically increasing `version`, and the full object value.

Schema: [`schemas/cache/history.ts`](../schemas/cache/history.ts)

## Real‑time Diff Messages
After hydration, updates are sent as diffs describing mutations to an entry.

Schema: [`schemas/cache/diff.ts`](../schemas/cache/diff.ts)

## API Reference

### `getById(id)`
Retrieves an entry from the cache by its unique identifier.

- **Parameters**
  - `id` (`string`): cache key to look up.
- **Returns**: `Promise<T | null>` resolving to the cached value or `null` if missing.
- **Errors**: throws `{ code: 'E_STALE_DATA' }` when the stored snapshot hash does not match the expected hash.

### `subscribe(filter)`
Subscribes to real‑time diff messages.

- **Parameters**
  - `filter` (`Record<string, unknown>`): criteria to select which entries emit updates.
- **Returns**: `() => void` unsubscribe function.
- **Events**: receives messages matching `cacheDiffMessageSchema`.

### `{cache.synced}` event
Emitted once the message history stream finishes and the cache is up to date.

- **Payload**: `{ id: string }` for the cache namespace that synced.

## Error Handling

### `E_STALE_DATA`
Thrown when a local snapshot hash differs from the authoritative hash.

```json
{
  "code": "E_STALE_DATA",
  "expected": "<expected hash>",
  "actual": "<actual hash>"
}
```

Consumers should discard the snapshot and rehydrate from message history when this error is encountered.
