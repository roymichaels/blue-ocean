# Contributing

## TON reference check

To keep the codebase free of TON integrations, a pre-commit and CI check scans tracked files for the string `TON` and common TON RPC endpoints like `toncenter.com`, `tonapi.io`, and `ton.org`.

Run the check manually with:

```bash
node scripts/check-no-ton.js
```

Any matches will cause commits or CI runs to fail.
