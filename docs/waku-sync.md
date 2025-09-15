# Multi-peer synchronisation validation

This note captures the scripted verification that two simulated devices stay in
sync when connected live over the Waku transport and after reconnecting to
hydrate from the shared object storage bucket.

## Test harness

- Script location: [`scripts/multi-peer-sync.js`](../scripts/multi-peer-sync.js)
- Execution command: `node scripts/multi-peer-sync.js`
- The harness spins up an in-memory Waku relay (`FakeWakuNetwork`) that delivers
  envelopes between peers and stores the history used for replay.
- Object storage is simulated through a shared `FakeS3Store` map which mimics
  the persistence and hydration semantics we use with S3/MinIO in production.

Each peer is modelled by the `AppInstance` class. The helper exposes
`goOnline`, `goOffline`, `addProduct`, `replayMissedMessages`, and
`hydrateFromS3` operations so we can drive both the live propagation path and
offline hydration path deterministically.

## Scenario 1 – Live Waku propagation

1. Bring Alice and Bob online and subscribe them to the Waku network.
2. Alice publishes a new product (`sku-online`).
3. The script records the elapsed time until Bob receives the envelope and
   confirms the product is added to his local catalogue.

**Result:** the measured latency for the simulated relay run was
approximately **2.9 ms** from publish to Bob's catalogue update.

## Scenario 2 – Offline hydration via S3

1. Both peers disconnect from the Waku relay.
2. Alice creates an additional product (`sku-offline`) while offline, ensuring
   the change is written to the shared store but never broadcast.
3. Bob reconnects, replays any missed relay history, and hydrates from the
   shared bucket.
4. The run validates that the offline product appears in Bob's snapshot and
   reports the time spent hydrating.

**Result:** the hydration pass added one product to Bob's catalogue and
completed in roughly **0.3 ms**. No replayed relay history was necessary, so
this path exercised the S3 hydration behaviour exclusively.

## Summary

Running `node scripts/multi-peer-sync.js` now produces both latency metrics in
stdout and throws if either peer fails to obtain the expected catalogue state.
This gives us a fast regression harness we can wire into CI once the real Waku
stack is in place.
