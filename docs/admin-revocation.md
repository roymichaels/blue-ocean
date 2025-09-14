# Admin Revocation Policy

Administrators are tracked in the `admins` setting. Any wallet listed there may approve new
admins and manage privileged settings. Removing a wallet from this list immediately revokes
its admin powers across the network.

## Revoking an Admin

1. An existing admin opens the settings dashboard.
2. The admin updates the `admins` list, removing the target wallet address.
3. A signed `settings.write` event is broadcast so other peers prune the revoked admin.

## Recovery

* **Re‑approval:** A revoked wallet can broadcast a new `admin.request`. Another active admin
  must approve the request to restore access.
* **Lost all admins:** If the admin list becomes empty, the next valid `admin.request` is
  automatically registered as the first admin. Operators can also set
  `ADMIN_WALLET_ADDRESS` and restart the node to bootstrap a recovery wallet.

Follow these steps to ensure admin privileges can be safely revoked and restored without
compromising network integrity.
