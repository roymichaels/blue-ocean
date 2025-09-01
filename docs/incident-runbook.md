# Incident Runbook

When production goes sideways, use this guide to restore service quickly.

## Rollback

1. **Identify last known good build.** Consult commit history or previous IPFS CID.
2. **Revert code:** `git revert <bad_commit>` and push or rebuild from prior tag.
3. **Redeploy:** rebuild the web bundle and pin the previous CID to IPFS or redeploy the mobile build.
4. **Verify:** confirm the app loads and agents synchronize as expected.

## Endpoint Failover

1. **Update `EXPO_PUBLIC_WAKU_BOOTSTRAP`** (e.g., via `.env`) with a healthy list of peers if overriding defaults.
2. **Override NEAR RPC:** restart deployments using `--endpoint <backup-url>`.
3. **Flush caches** with `expo start -c` to ensure new endpoints are used.
4. **Monitor** connectivity logs from agents for successful peer discovery.

## Gateway Failover

1. **Publish the build** to an alternate IPFS pinning service if the current gateway is down.
2. **Update links** to point at a healthy gateway, e.g. `https://dweb.link/ipfs/<CID>/`.
3. **Clear caches** and refresh clients to force retrieval from the new gateway.
4. **Backfill** the original pinning service when it recovers to maintain redundancy.
