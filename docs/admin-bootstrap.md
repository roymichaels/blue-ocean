# Admin Bootstrap

New administrators bootstrap into a node in three steps.

1. **Request** – The wallet broadcasts an `admin.requested` message on `/blue-ocean/users/1`.
   - Approval prompts must satisfy WCAG 2.2 AA contrast, focus, and keyboard accessibility requirements.
2. **Approval** – An existing admin validates the request, checking signature and allowlist.
3. **Event emission** – On success, the approver publishes `admin.registered` and agents emit `admin.bootstrap.completed` for audit trails.

```mermaid
flowchart LR
    A[Request\nadmin.requested\n(signed Waku message)] --> B[Approval\nadmin verifies\n(WCAG-compliant prompt)]
    B --> C[Event emission\nadmin.registered broadcast]
```

The flowchart illustrates the request, approval, and event emission sequence for bootstrapping administrators.
