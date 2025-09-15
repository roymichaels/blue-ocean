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

### `{delivery.assigned}`
Emitted when a delivery job is assigned or its status changes.

- **Payload**
  - `jobId` (`string`): delivery job identifier.
  - `orderId` (`string`): related order identifier.
  - `driverId` (`string`): identifier of the assigned driver.
  - `status` (`'pending' | 'in_progress' | 'completed' | 'cancelled'`): delivery status.
  - `storeId` (`string`): store scope for the delivery topic.

### Output Payloads

#### `{notify.orderCreated}`
Broadcast notification to the user.

- **Payload** (`notifyOrderCreatedSchema`)
  - `notification` (`Notification`): localized title and message.

#### `{notify.orderFailed}`
Broadcast when an order fails.

- **Payload** (`notifyOrderFailedSchema`)
  - `notification` (`Notification`): localized title and message.

#### `{notify.deliveryUpdate}`
Broadcast delivery progress updates over Waku.

- **Payload** (`deliveryUpdatePayloadSchema`)
  - `event` (`'order.created' | 'delivery.assigned'`): source event driving the update.
  - `orderId` (`string`): related order identifier.
  - `jobId` (`string`, optional): delivery job identifier when available.
  - `driverId` (`string`, optional): assigned driver identifier.
  - `status` (`'pending' | 'in_progress' | 'completed' | 'cancelled'`): delivery status.
  - `timestamp` (`number`): milliseconds since epoch when the update was published.
  - `storeId` (`string`): store topic scope for subscribers.

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
  - `event` (`'order.created' | 'order.failed' | 'delivery.assigned'`)
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
