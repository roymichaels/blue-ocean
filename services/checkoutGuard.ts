import { Buffer } from 'buffer';
import { verify } from '@noble/ed25519';
import { utils as nearUtils } from 'near-api-js';
import { chainAdapter } from '@/services/chain';
import { getUser } from '@/features/auth/services/nearUsers';
import { getSession, validateToken, SessionToken } from '@/services/session';
import type { User, UserRole } from '@/types';

const ALLOWED_ROLES: ReadonlySet<UserRole> = new Set([
  'user',
  'driver',
  'store-owner',
  'admin',
  'platform-admin',
]);

function normalizePublicKey(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('ed25519:') ? trimmed.slice(8) : trimmed;
}

function decodeSignature(signature: string): Uint8Array {
  const trimmed = signature.trim();
  if (!trimmed) throw new Error('{E_SESSION_PROOF}');
  const withoutPrefix = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (/^[0-9a-fA-F]+$/.test(withoutPrefix) && withoutPrefix.length % 2 === 0) {
    return Uint8Array.from(Buffer.from(withoutPrefix, 'hex'));
  }
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length >= 8) {
    try {
      const buf = Buffer.from(trimmed, 'base64');
      if (buf.length) return Uint8Array.from(buf);
    } catch {}
  }
  try {
    return nearUtils.serialize.base_decode(trimmed);
  } catch {
    throw new Error('{E_SESSION_PROOF}');
  }
}

async function ensureSignature(record: SessionToken, publicKey: string): Promise<void> {
  const sealed = record.sealed;
  if (!sealed) throw new Error('{E_SESSION_PROOF}');
  const message = Buffer.from(sealed.cipher, 'utf8');
  const signature = decodeSignature(record.token);
  if (signature.length !== 64) throw new Error('{E_SESSION_PROOF}');
  let publicKeyBytes: Uint8Array;
  try {
    publicKeyBytes = nearUtils.serialize.base_decode(publicKey);
  } catch {
    throw new Error('{E_SESSION_PROOF}');
  }
  if (publicKeyBytes.length !== 32) throw new Error('{E_SESSION_PROOF}');
  const ok = await verify(signature, message, publicKeyBytes);
  if (!ok) throw new Error('{E_SESSION_PROOF}');
}

function ensureRole(user: User | null, userId: string): User {
  if (!user) throw new Error('{E_CHECKOUT_FORBIDDEN}');
  if (user.address && user.address !== userId) {
    throw new Error('{E_CHECKOUT_FORBIDDEN}');
  }
  if (user.customerTier === 'banned') {
    throw new Error('{E_CHECKOUT_FORBIDDEN}');
  }
  const role = user.role ?? 'user';
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error('{E_CHECKOUT_FORBIDDEN}');
  }
  return user;
}

export interface CheckoutSessionContext {
  token: string;
  user: User;
  walletPublicKey: string;
}

interface CheckoutSessionOptions {
  user?: User | null;
}

export async function assertCheckoutSession(
  userId: string,
  token: string,
  options: CheckoutSessionOptions = {},
): Promise<CheckoutSessionContext> {
  if (!userId) throw new Error('{E_CHECKOUT_FORBIDDEN}');
  validateToken(token, ['checkout']);
  const record = getSession(token);
  if (!record || !record.sealed) {
    throw new Error('{E_SESSION_PROOF}');
  }

  const normalizedKey = normalizePublicKey(record.sealed.walletPublicKey);
  if (!normalizedKey) {
    throw new Error('{E_SESSION_PROOF}');
  }
  await ensureSignature(record, normalizedKey);

  const adapterKey = normalizePublicKey(chainAdapter.getPublicKey?.());
  if (adapterKey && adapterKey !== normalizedKey) {
    throw new Error('{E_SESSION_PROOF}');
  }

  const currentAccount = chainAdapter.getAccountId?.();
  if (currentAccount && currentAccount !== userId) {
    throw new Error('{E_CHECKOUT_FORBIDDEN}');
  }

  let profile = options.user ?? null;
  if (profile && profile.id !== userId) {
    profile = null;
  }
  if (!profile) {
    profile = await getUser(userId);
  }
  const user = ensureRole(profile, userId);

  return { token, user, walletPublicKey: normalizedKey };
}
