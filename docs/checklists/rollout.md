# Rollout Checklist

- [ ] Tag the release in git and generate release notes
- [ ] Build web assets with `npm run build:web`
- [ ] Pin `dist/` to IPFS and record the CID
- [ ] Update gateway links and announce the new CID
- [ ] Deploy mobile bundles to app stores if applicable
- [ ] Monitor logs and metrics for the first 24 hours
- [ ] Execute rollback plan if critical issues arise
