# Tenant KYC Policy (Underground Compliance)

- Toggle: `KYC_REQUIRED = on|off`
- Evidence: buyer uploads redacted doc; client hashes + encrypts; we store only hash + encrypted URI + status
- States: none → pending → verified/rejected
- Admin with `admin:users` + PIN approves
- Checkout blocked when `KYC_REQUIRED=on` and status != verified
