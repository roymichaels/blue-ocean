# Core SDK Architecture Review

## Objective
- Align on the minimal set of reusable primitives that every feature consumes (agents, transports, storage, UI bindings).
- Map existing implementations to the future core SDK surface so we know what to extract versus refactor.
- Decide ownership, sequencing, and success metrics for the SDK workstream.

## Proposed Timing
- Target window: Week of <insert date>; PM to confirm exact slot with engineering & product leads.
- Duration: 45 minutes (25 min discussion, 15 min decisions, 5 min actions).

## Attendees
- Agents lead (owner of `agents/*`).
- Frontend/platform representative (owner of `src/features/*`).
- Protocol/Waku specialist (owner of `schemas/waku/*`).
- Security reviewer (signing + baseline guardrails).
- PM/Founder sponsor (clarify scope + business priorities).

## Agenda
1. Snapshot the current flows (stores, auth, notifications) and identify duplicated logic.
2. Define the core SDK boundaries: messaging adapter, auth/session, store/catalog data layer, UI hooks/components.
3. Decide on the first extraction target and gating criteria (tests, bundle budgets, DX checks).
4. Assign follow-up tasks and owners.

## Pre-reads
- `docs/codex/playbook.md`
- `docs/architecture/agents.md`
- `docs/architecture/topics-waku.md`
- `docs/security/baseline.md`
- `docs/security/message-signing.md`
- `src/features/stores/services/nearStores.ts`
- `agents/stores-agent.ts`

## Deliverables
- Written decision record summarizing agreed SDK shape, success metrics, and migration plan.
- Backlog entries for each extraction/refactor (agents, features, tests).
- Scheduling outcome recorded in sprint notes or shared calendar.

## Prep Checklist
- Inventory every shared helper/util currently imported across features.
- Catalog Waku topics, payload schemas, and identify any gaps.
- Collect bundle/test timing baseline so improvements can be measured.
- Flag risky dependencies (platform, build tooling) that may block refactors.

## Follow-up Plan
- Publish meeting notes + decision record in `docs/architecture/core-sdk.md` (new or updated file).
- Open tasks/issues referencing the decision record for each work item.
- Revisit progress in weekly sync until milestones are met.
