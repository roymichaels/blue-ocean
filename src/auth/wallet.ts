import { useCallback } from 'react';
import { Buffer } from 'buffer';
import { useWallet } from '@/contexts/WalletProvider';
import { signIn, getAccountId, getPublicKey } from '@/features/auth/services/nearAuth';
import {
  requestScopes,
  refreshToken,
  validateToken,
  getSession,
  SessionToken,
  EncryptedScopePayload,
} from '@/services/session';
import { getEd25519KeyPair } from '@/services/localIdentity';
import { deriveSharedKey, aesEncrypt, aesDecrypt, deriveChatSalt } from '@/utils/encryption';

const SESSION_ENCRYPTION_INFO = 'wallet.session';
const WALLET_PUBLIC_KEY_ERROR = 'Wallet public key unavailable';

function readAccountId(): string | null {
  return typeof getAccountId === 'function' ? getAccountId() : null;
}

function readWalletPublicKey(): string | null {
  return typeof getPublicKey === 'function' ? getPublicKey() : null;
}

export async function connectWallet(): Promise<{ address: string; publicKey: string }> {
  let address = readAccountId();
  let publicKey = readWalletPublicKey();

  if (!address || !publicKey) {
    if (typeof signIn !== 'function') {
      throw new Error(WALLET_PUBLIC_KEY_ERROR);
    }
    await signIn();
    address = readAccountId();
    publicKey = readWalletPublicKey();
  }

  if (!address || !publicKey) {
    throw new Error(WALLET_PUBLIC_KEY_ERROR);
  }

  return { address, publicKey };
}

async function sealPayload(
  payload: string,
  walletPublicKey: string,
): Promise<EncryptedScopePayload> {
  const { privateKey, publicKey } = await getEd25519KeyPair();
  const identityPublicKey = Buffer.from(publicKey).toString('hex');
  const salt = deriveChatSalt(identityPublicKey, walletPublicKey);
  const key = await deriveSharedKey(privateKey, walletPublicKey, SESSION_ENCRYPTION_INFO, salt);
  const cipher = await aesEncrypt(payload, key);
  return {
    cipher,
    walletPublicKey,
    identityPublicKey,
  };
}

function compareScopes(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

async function verifySealedPayload(record: SessionToken): Promise<void> {
  const sealed = record.sealed;
  if (!sealed) return;

  const { privateKey, publicKey } = await getEd25519KeyPair();
  const identityPublicKey = Buffer.from(publicKey).toString('hex');
  if (sealed.identityPublicKey !== identityPublicKey) {
    throw new Error('{E_SESSION_PROOF}');
  }

  try {
    const salt = deriveChatSalt(sealed.identityPublicKey, sealed.walletPublicKey);
    const key = await deriveSharedKey(privateKey, sealed.walletPublicKey, SESSION_ENCRYPTION_INFO, salt);
    const decrypted = await aesDecrypt(sealed.cipher, key);
    const parsed = JSON.parse(decrypted) as { scopes: unknown; exp: unknown };

    if (!Array.isArray(parsed.scopes) || parsed.scopes.some((s) => typeof s !== 'string')) {
      throw new Error('{E_SESSION_PROOF}');
    }
    if (typeof parsed.exp !== 'number') {
      throw new Error('{E_SESSION_PROOF}');
    }
    if (!compareScopes(record.scopes, parsed.scopes)) {
      throw new Error('{E_SESSION_PROOF}');
    }
    if (parsed.exp !== record.exp) {
      throw new Error('{E_SESSION_PROOF}');
    }
  } catch (err) {
    if (err instanceof Error && err.message === '{E_SESSION_PROOF}') {
      throw err;
    }
    throw new Error('{E_SESSION_PROOF}');
  }
}

export function useWalletSessions(): {
  loginWithWallet: (scopes: string[]) => Promise<SessionToken>;
  useToken: (token: string, scopes: string[]) => Promise<SessionToken>;
} {
  const { sign } = useWallet();

  const loginWithWallet = useCallback(
    async (scopes: string[]): Promise<SessionToken> => {
      if (!Array.isArray(scopes) || scopes.length === 0) {
        throw new Error('{E_SCOPE}');
      }
      const { publicKey: walletPublicKey } = await connectWallet();
      let sealed: EncryptedScopePayload | undefined;
      const session = await requestScopes(
        scopes,
        async (payload) => {
          sealed = await sealPayload(payload, walletPublicKey);
          return sign(sealed.cipher);
        },
        undefined,
        {
          sealed: () => sealed,
        },
      );
      await verifySealedPayload(session);
      return session;
    },
    [sign],
  );

  const useToken = useCallback(
    async (token: string, scopes: string[]): Promise<SessionToken> => {
      if (!Array.isArray(scopes) || scopes.length === 0) {
        throw new Error('{E_SCOPE}');
      }
      const record = getSession(token);
      if (!record) {
        throw new Error('{E_EXPIRED}');
      }

      await verifySealedPayload(record);
      validateToken(token, scopes);

      const { publicKey: connectedPublicKey } = await connectWallet();
      const walletPublicKey = record.sealed?.walletPublicKey ?? connectedPublicKey;
      let sealed: EncryptedScopePayload | undefined;
      const refreshed = await refreshToken(
        token,
        async (payload) => {
          sealed = await sealPayload(payload, walletPublicKey);
          return sign(sealed.cipher);
        },
        undefined,
        {
          sealed: () => sealed,
        },
      );
      await verifySealedPayload(refreshed);
      return refreshed;
    },
    [sign],
  );

  return { loginWithWallet, useToken };
}

export type WalletSession = SessionToken;
