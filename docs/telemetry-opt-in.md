# Opt-in telemetry guidelines

Telemetry is never required to operate Blue Ocean. When you need visibility, collect metrics in a way that preserves privacy and
respects tenant consent.

## Core principles

1. **Explicit consent** – collect analytics only after the tenant or end user has opted in.
2. **Minimal identifiers** – hash or truncate account IDs, wallet addresses, and IP metadata.
3. **Event transparency** – document every event name, payload, and retention plan in the runbook.
4. **Revocability** – build fast paths to erase local caches and remote stores if consent is withdrawn.

## Implementation workflow

1. Surface a consent screen that explains how analytics help the tenant. Persist the answer in `AsyncStorage` or the tenant's
   secure key store. Re-check the flag at boot.
2. Wire opt-in state to the analytics publisher. The SDK exposes a runtime toggle so agents can skip instrumentation when
   telemetry is disabled.
3. Ship guardrails alongside code changes. Add unit tests that assert telemetry is disabled when consent is missing, and provide
   manual QA steps in release notes.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from '@blue-ocean/analytics';

export async function publishEvent(type: string, payload: Record<string, unknown>) {
  const consent = await AsyncStorage.getItem('telemetry:consent');
  if (consent !== 'granted') {
    return; // telemetry remains off by default
  }

  analytics.publish({ type, payload });
}
```

## Communicating with tenants

- Update [docs/analytics.md](./analytics.md) when adding new event types.
- Provide UI copy that clarifies events are relayed over `/blue-ocean/{tenantId}/analytics/1` with hashed actor identifiers.
- Offer export and deletion tooling in the admin console so tenants can manage historic telemetry independently.

## Opt-out teardown

When a tenant withdraws consent:

1. Stop publishing analytics events immediately and remove `telemetry:consent`.
2. Purge historical data from your observability stack.
3. Broadcast a `telemetry.opt_out` notification so downstream dashboards can react.
4. Confirm the change by tailing the analytics topic or using the [API playground](./api-playground.md) to hit your observability
   webhook.
