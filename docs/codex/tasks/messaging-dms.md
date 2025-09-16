# Task: Buyer↔Seller Direct Messaging

**Outcome**: Ship an end-to-end encrypted inbox that lets buyers and sellers exchange direct messages (text, order references, and images) with <1s live delivery, searchable locally across active threads.

**Interface**
- Inputs:
  - `openThread({ buyerId, sellerId, orderId? })` → derives the `/dm/1/{low}-{high}` topic + per-day secret, ensures a thread record exists, and optionally seeds the composer with an order reference chip.
  - `sendMessage(threadId, { text?, imageCid?, orderRefId? })` → signs the payload, encrypts it with the daily pair secret, and publishes the Waku envelope via `WakuContext.send`.
  - `searchThread(threadId, query)` → runs an on-device search (Fuse-style fuzzy match) over the most recent 100 decrypted messages cached for that thread.
- Outputs/Events:
  - `dm.thread.updated` (chat-agent) when lastMessage/lastMessageTime/unread counts change so the inbox list can re-order itself.
  - `dm.message.sent` / `dm.message.received` events surfaced from `WakuContext` to hydrate the thread view in real time.
  - `dm.search.results` containing ranked message hits (with snippet + messageId) for the active thread.
- Errors:
  - `{E_ENCRYPT}` when pair secret derivation or AES encryption fails.
  - `{E_ATTACHMENT_LIMIT}` for oversized/unsupported image uploads.
  - `{E_RATE_LIMIT}` when a wallet exceeds message burst limits.
  - `{E_OFFLINE}` when publish fails after retries (UI shows queued state).

**Plan**
- Agent(s) touched:
  - `agents/chat-agent.ts` → persist per-thread metadata, emit `dm.thread.updated`, and expose helpers for rotating pair secrets.
  - `services/database.ts` → store encrypted payloads + decrypted search cache, cap history at 100 per thread, and materialize attachment metadata.
  - `contexts/WakuContext.tsx` → support `/dm/1/{low}-{high}` topics, daily secret rotation, message signature verification, and latency instrumentation.
  - `services/openDM.ts` → reuse seller profiles/order info to seed threads and capture seller chat public keys.
- Waku topics:
  - `/dm/1/{low}-{high}` where `low` and `high` are lexicographically sorted wallet ids.
  - Append a daily salt (`YYYYMMDD`) into the pair secret: `secret = blake2b(lower|higher|date)`; accept previous day’s secret for grace period so late deliveries still decrypt.
  - Maintain `/dm/ack/1/{low}-{high}` lightweight receipts so `dm.message.sent` can flip queued messages to delivered when peers are live.
- Schemas to add/update:
  - `schemas/waku/dm.message.ts` defining `{ text?: string; imageCid?: string; orderRefId?: string; ts: number; nonce: string }` + signature guard.
  - Export through `schemas/waku/index.ts` and `types/waku.ts`.
  - Extend `schemas/waku/settings.ts` if we persist per-day secrets or inbox preferences.
- UI surfaces/screens:
  - Replace `app/messages/index.tsx` placeholder with inbox + thread split view (FlashList for threads/messages, composer with attachment + order chip picker).
  - Add shared components under `src/features/chat` (e.g., `InboxList`, `ThreadView`, `MessageBubble`, `Composer`), supporting RTL layouts from `ThemeProvider`.
  - Order reference chips navigate via `router.push('/orders/[id]')` to the existing detail view.
  - Surface unread badges in global nav using `useChatRooms` hook refresh.

**DoD**
- Tests:
  - Crypto round-trip: derive pair secret for two wallets, encrypt/decrypt across day boundary (`tests/chatCryptoDm.test.ts`).
  - Attachment pipeline: mock an image upload, ensure CID is transmitted and rendered (`tests/messagesAttachment.test.tsx`).
  - RTL bubbles: render Hebrew locale snapshot ensuring `MessageBubble` mirrors alignment (`tests/messagesRtl.snapshot.test.tsx`).
  - Search relevance: seed 120 local messages, assert top hits come from last 100 without network calls (`tests/messagesSearch.test.ts`).
  - Ensure offline search path never invokes network mocks (`tests/messagesSearchOffline.test.ts`).
- Docs:
  - Update `docs/architecture/topics-waku.md` with `/dm/1/{low}-{high}` topic + envelope.
  - Add flow notes to `docs/ui/mvp-app-tree.md` and wireframes.
  - Document error codes + latency SLO in `docs/performance.md` or new DM section.
- Observability:
  - Emit `service_latency_ms{service="dm.send"}` and `service_latency_ms{service="dm.receive"}` and alert when p95 > 1000ms.
  - Track local counter `dm_message_failures_total` for encryption/publish issues.

**Risk**
- Pair secret rotation drift (wallet offline across UTC rollover) could prevent decrypting new messages; mitigate by caching the previous day’s secret and including a UTC timestamp in envelopes so we can retry with `date-1` automatically.

**Flag**
- MVP: **Yes** — no feature flag; replaces current “Coming Soon” screen.

**Ready-to-earn**
- Gives the first tenant an encrypted, searchable support channel to resolve buyer issues and keep orders moving without leaving Blue Ocean.
