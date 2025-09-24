import { z } from 'zod';

// Result of signing an arbitrary message using a wallet's private key.
// Signatures should be generated on demand and must not be persisted to disk.
export const walletSignatureSchema = z.object({
  message: z.string(),
  signature: z.string(),
});

export type WalletSignature = z.infer<typeof walletSignatureSchema>;
