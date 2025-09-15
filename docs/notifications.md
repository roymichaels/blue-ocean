# Notifications Contract

Defines the messaging contract for order events, localized notifications, and error semantics.

## Event Schemas

### `{order.created}`
Emitted when an order is successfully created.

- **Payload** (`orderCreatedEventSchema`)
  - `orderId` (`string`): unique order identifier.
  - `userId` (`string`): user who placed the order.
  - `total` (`number`): order total amount.

### `{order.failed}`
Emitted when an order cannot be processed.

- **Payload** (`orderFailedEventSchema`)
  - `orderId` (`string`): affected order identifier.
  - `userId` (`string`): user who attempted the order.
  - `code` (`string`): error code describing the failure.
  - `reason` (`string`): human readable explanation.

### Output Payloads

#### `{notify.orderCreated}`
Broadcast notification to the user.

- **Payload** (`notifyOrderCreatedSchema`)
  - `notification` (`Notification`): localized title and message.

#### `{notify.orderFailed}`
Broadcast when an order fails.

- **Payload** (`notifyOrderFailedSchema`)
  - `notification` (`Notification`): localized title and message.

## API Reference

### `subscribe(filter)`
Subscribes to notification outputs.

- **Parameters**
  - `filter` (`Record<string, unknown>`): selection criteria.
- **Returns**: `() => void` unsubscribe function.
- **Events**: receives `notify.orderCreated` and `notify.orderFailed` payloads.

### `publish(event, payload)`
Producers send order events to the network.

- **Parameters**
  - `event` (`'order.created' | 'order.failed'`)
  - `payload` (matching event schema)
- **Errors**: may reject with `{ code: 'E_BACKLOG', retryAfter: number }` when the node backlog is full.

## Error Handling

### `E_BACKLOG`
Thrown when a node cannot accept more events.

```json
{
  "code": "E_BACKLOG",
  "retryAfter": 1000
}
```

Producers should pause publishing and retry after at least `retryAfter` milliseconds. Consumers encountering this error should back off and resubscribe once the delay has passed.
