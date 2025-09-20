# Codex Playbook — How to do a Task

> TL;DR: Always start at AGENTS.md, then follow links.

## Steps
1. **Confirm scope**: Is it MVP-critical? If not, mark **Coming Soon** with a feature flag name.
2. **Read entrypoints**:
   - Root `AGENTS.md` → `/architecture/agents`
   - `/security/baseline` → policies, roles, PIN-2FA
   - `/architecture/topics-waku` → topics & payload shapes
   - `/ui/mvp-app-tree` & `/ui/wireframes` → screens, flows, buttons
3. **Design small**:
   - Define the interface (inputs → outputs/events; errors).
   - Decide where state lives (agent + cache contract).
   - Pick/create Waku topics; confirm encryption.
4. **Write a Task** using the **Task Template**.
5. **Implement**:
   - Update schema types under `schemas/waku/*`.
   - Update agent logic under `agents/*`.
   - Add tests under `tests/*` (integration if it touches flows).
6. **Validate** with **MVP Checklist**.
7. **Open PR** with the **PR Template**.

## Guardrails
- **No Matrix**. Waku-only.
- **No centralized telemetry**. Anonymous, minimal events over Waku.
- **Role-aware**: first wallet = admin; later admins require approval.
- **PIN-2FA** required for admin actions + checkout.
- **i18n/RTL**: Hebrew strings must exist for any new copy.

## Ready-to-earn rule
If the change doesn't make it faster/easier for a tenant to:
1) create a store, 2) list products, 3) accept payment (NEAR; MoonPay optional/flag), 4) see & fulfill orders — it’s probably **Coming Soon**.

## Current Architecture Workstreams
- **Core SDK Alignment**: Review agenda + scheduling details live in docs/architecture/core-sdk-review.md. Start there before opening new refactor tasks.

