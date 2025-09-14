# Admin Revocation Procedure

Compromised administrators must be removed quickly to prevent abuse. Follow these steps:

1. **Broadcast Revocation**
   - An authorized admin with `admin:settings` scope sends an updated `adminScopes` map removing the compromised address.
   - Optionally, remove the address from the `admins` list entirely.
2. **Propagate Update**
   - All nodes listening to `/blue-ocean/settings/1` receive the `settings.write` event and refresh cached admin scopes.
3. **Invalidate Sessions**
   - Purge any local sessions or keys associated with the revoked admin.
4. **Audit**
   - Record the revocation event and monitor for any further activity from the compromised key.

Revocation takes effect once the settings update is processed across the network.
