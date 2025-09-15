# Admin Bootstrap

New administrators bootstrap into a node in three steps.

1. **Request** – The wallet broadcasts an `admin.joinRequested` message on `/blue-ocean/users/1` with `{ address, requestedAt }` signed by the wallet.
   - Approval prompts must satisfy WCAG 2.2 AA contrast, focus, and keyboard accessibility requirements and load within 2.5s (TTI target).
2. **Approval** – An existing admin validates the request, checking signature freshness and least-privilege scope assignments before granting.
   - Pending approvals are cached offline so the queue survives restarts and poor connectivity.
3. **Event emission** – On success, the approver publishes `admin.registered`; unauthorized attempts (>3/min) trigger a local alert and counters increase for on-device observability.

```mermaid
flowchart LR
    A[Request\nadmin.joinRequested\n(signed Waku message)] --> B[Approval\nadmin verifies\n(WCAG-compliant prompt)]
    B --> C[Event emission\nadmin.registered broadcast]
```

The flowchart illustrates the request, approval, and event emission sequence for bootstrapping administrators.
