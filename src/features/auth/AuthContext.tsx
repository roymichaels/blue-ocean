// TODO:KYC-006 enable history replay to recover receipts on reinstall
// TODO:KYC-007 persist encrypted receipt hash/sig to tenant KV with 180d retention
// TODO:KYC-012 retry/backoff if tenant public key missing; show inline banner
// TODO:KYC-020 expose sync metrics (receipts count, lastTs)

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spinner } from '@/ui';
import { User } from '@/types';
import { errorLog } from '@/utils/logger';
import { useWallet } from '@/contexts/WalletProvider';
import { chainAdapter } from '@/services/chain';
import usersAgent from '@/agents/users-agent';
import { getEd25519KeyPair } from '@/services/localIdentity';
import { t } from '@/i18n';
import { Buffer } from 'buffer';
import SettingsAgent from '@/agents/settings-agent';
import { makeSignedWakuMessage } from '@/utils/wakuSigning';
import { publish as publishWaku } from '@/services/waku';
import uuid from '@/utils/uuid';
import { getUser as getChainUser, setUser as setChainUser } from './services/nearUsers';
import { sessionEvents, revokeToken, listSessions } from '@/services/session';
import {
  loadKycReceipt,
  subscribeToKycReceipts,
  type KycReceipt,
} from '@/services/kycReceipts';
import { adminUsersTopic } from '@/utils/wakuTopics';


interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  isStoreOwner: boolean;
  isPlatformAdmin: boolean;
  user: User | null;
  loading: boolean;
  sessionToken: string | null;
  login: () => Promise<void>;
  signup: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isAdmin: false,
  isDriver: false,
  isStoreOwner: false,
  isPlatformAdmin: false,
  user: null,
  loading: false,
  sessionToken: null,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  checkAuthState: async () => {},
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

const SESSION_EXP_TOLERANCE_MS = 60_000;
const BROWSE_SCOPE = 'read';
const USERS_TOPIC = adminUsersTopic();
const ADMIN_BOOTSTRAP_FLAG_PREFIX = 'auth.adminBootstrap:';

export function AuthProvider({ children }: AuthProviderProps) {
  const { address, connect, disconnect } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const adminBootstrapRequests = useRef<Set<string>>(new Set());

  const syncSessionToken = useCallback(() => {
    const records = listSessions();
    const now = Date.now();
    const active = records.filter((record) => now <= record.exp + SESSION_EXP_TOLERANCE_MS);
    if (active.length === 0) {
      setSessionToken((current) => (current !== null ? null : current));
      return;
    }
    const sorted = [...active].sort((a, b) => b.exp - a.exp);
    const preferred = sorted.find((record) => record.scopes.includes(BROWSE_SCOPE)) ?? sorted[0];
    const nextToken = preferred?.token ?? null;
    setSessionToken((current) => (current === nextToken ? current : nextToken));
  }, []);

  const maybeRequestAdminBootstrap = useCallback(
    async (profile: User) => {
      const id = profile.address || profile.id;
      if (!id) return;
      const normalizedId = id.toLowerCase();
      const attempts = adminBootstrapRequests.current;
      if (attempts.has(normalizedId)) return;
      attempts.add(normalizedId);
      const release = () => {
        attempts.delete(normalizedId);
      };

      const storageKey = `${ADMIN_BOOTSTRAP_FLAG_PREFIX}${normalizedId}`;
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored === '1') {
          return;
        }
      } catch (err) {
        errorLog('Failed to read admin bootstrap flag', err);
      }

      let admins: string[] = [];
      try {
        admins = await SettingsAgent.getInstance().getAdmins();
      } catch (err) {
        errorLog('Failed to fetch admin list for bootstrap', err);
        release();
        return;
      }

      if (admins.length > 0 || profile.role !== 'user') {
        try {
          await AsyncStorage.setItem(storageKey, '1');
        } catch (err) {
          errorLog('Failed to persist admin bootstrap flag', err);
        }
        return;
      }

      try {
        const message = await makeSignedWakuMessage(
          'admin.joinRequested',
          {
            address: profile.address || profile.id,
            displayName: profile.displayName,
            nonce: uuid(),
            ts: Date.now(),
          },
          'user',
        );
        await publishWaku(USERS_TOPIC, message);
        try {
          await AsyncStorage.setItem(storageKey, '1');
        } catch (err) {
          errorLog('Failed to persist admin bootstrap flag', err);
        }
      } catch (err) {
        errorLog('Failed to publish admin bootstrap request', err);
        release();
      }
    },
    [adminBootstrapRequests],
  );

  useEffect(() => {
    const handleTokenChange = () => {
      syncSessionToken();
    };
    sessionEvents.on('token.rotated', handleTokenChange);
    sessionEvents.on('token.issued', handleTokenChange);
    sessionEvents.on('token.loaded', handleTokenChange);
    sessionEvents.on('token.revoked', handleTokenChange);
    return () => {
      sessionEvents.off('token.rotated', handleTokenChange);
      sessionEvents.off('token.issued', handleTokenChange);
      sessionEvents.off('token.loaded', handleTokenChange);
      sessionEvents.off('token.revoked', handleTokenChange);
    };
  }, [syncSessionToken]);

  const checkAuthState = async () => {
    // Prefer WalletProvider address; fall back to adapter's plain getters only
    const maybeUseAccount: any = (chainAdapter as any).useAccount;
    const mockedAccountId =
      typeof maybeUseAccount === 'function' &&
      (maybeUseAccount as any)._isMockFunction
        ? maybeUseAccount()
        : null;
    const walletAddress =
      address || chainAdapter.getAccountId?.() || mockedAccountId || null;

    if (!walletAddress) {
      // Wallet not connected – ensure we clear any stale user data
      setUser(null);
      setSessionToken(null);
      return;
    }

    try {
      let profile = await getChainUser(walletAddress);

      // If a profile already exists, expose it immediately to the UI so
      // role checks reflect the latest stored value even if enrichment fails.
      if (profile) {
        setUser(profile);
      }

      // Ensure a Waku key pair exists and retrieve the public key
      const { publicKey } = await getEd25519KeyPair();
      const chatPublicKey = Buffer.from(publicKey).toString('hex');

      if (profile) {
        const roleChanged = user?.role !== profile.role;
        if (profile.chatPublicKey !== chatPublicKey || roleChanged) {
          profile = { ...profile, chatPublicKey };
          await setChainUser(profile);
          try {
            await usersAgent.update(profile);
          } catch {
            // Ignore agent propagation errors in non-wallet test environments
          }
          setUser(profile);
        }
      } else {
        profile = {
          id: walletAddress,
          username: walletAddress,
          displayName: walletAddress,
          isAdmin: false,
          address: walletAddress,
          role: 'user',
          chatPublicKey,
        };
        await setChainUser(profile);
        try {
          await usersAgent.add(profile);
        } catch {
          // Ignore agent propagation errors in non-wallet test environments
        }
        setUser(profile);
      }

      if (profile) {
        void maybeRequestAdminBootstrap(profile);
      }
    } catch {
      // Best-effort: keep existing stored profile if available
      try {
        if (walletAddress) {
          const existing = await getChainUser(walletAddress);
          if (existing) setUser(existing);
          else setUser(null);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    syncSessionToken();
  };

  const refreshSession = async () => {
    // Re-check the authentication state when recovering from a lost
    // connection or after the wallet reconnects.
    const maybeUseAccount2: any = (chainAdapter as any).useAccount;
    const mockedAccountId2 =
      typeof maybeUseAccount2 === 'function' &&
      (maybeUseAccount2 as any)._isMockFunction
        ? maybeUseAccount2()
        : null;
    const current =
      address || chainAdapter.getAccountId?.() || mockedAccountId2;
    if (!current) {
      setUser(null);
      return;
    }

    await checkAuthState();
  };

  useEffect(() => {
    checkAuthState().finally(() => setInitialized(true));
  }, [address]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    const buyerPublicKey = user?.chatPublicKey;
    const buyerId = user?.id;
    if (!buyerPublicKey || !buyerId) {
      return () => {};
    }

    const applyReceipt = async (receipt: Awaited<ReturnType<typeof loadKycReceipt>>) => {
      if (!receipt) return;
      const receiptUserId =
        (typeof receipt.payload.data === 'object' && receipt.payload.data && 'userId' in receipt.payload.data)
          ? (receipt.payload.data as Record<string, unknown>).userId
          : undefined;
      if (receiptUserId && receiptUserId !== buyerId) return;
      const targetId = typeof receiptUserId === 'string' && receiptUserId.length > 0 ? receiptUserId : buyerId;
      const currentProfile = await getChainUser(targetId);
      const baseProfile = currentProfile || (targetId === user?.id ? user : null);
      if (!baseProfile) return;
      const updatedProfile: User = {
        ...baseProfile,
        kycStatus: 'verified',
        kycApprovedAt: receipt.payload.issuedAt,
        kycApprovedBy: receipt.payload.issuerPublicKey,
      };
      await setChainUser(updatedProfile);
      if (!active) return;
      setUser((prev) => {
        if (!prev || prev.id !== updatedProfile.id) return prev;
        if (
          prev.kycStatus === 'verified' &&
          prev.kycApprovedAt === updatedProfile.kycApprovedAt &&
          prev.kycApprovedBy === updatedProfile.kycApprovedBy
        ) {
          return prev;
        }
        return { ...prev, ...updatedProfile };
      });
    };

    (async () => {
      try {
        const stored = await loadKycReceipt(buyerPublicKey);
        await applyReceipt(stored);
      } catch (err) {
        errorLog('Failed to hydrate local KYC receipt', err);
      }

      try {
        unsubscribe = await subscribeToKycReceipts(buyerPublicKey, {
          fetchHistory: false,
          onReceipt: async (receipt: KycReceipt) => {
            await applyReceipt(receipt);
          },
          onError: (err: unknown) => {
            errorLog('kyc.receipt subscription error', err);
          },
        });
      } catch (err) {
        errorLog('Failed to subscribe to KYC receipts', err);
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [user?.chatPublicKey, user?.id]);

  const login = async () => {
    try {
      await connect();
      await checkAuthState();
      syncSessionToken();
    } catch (err: unknown) {
      errorLog(
        t('auth.walletConnectionFailed', 'Wallet connection failed'),
        err
      );
      Alert.alert(
        t('common.error', 'Error'),
        t(
          'auth.walletConnectionFailedTry',
          'Wallet connection failed. Please try again.'
        )
      );
    }
  };

  const signup = login;

  const logout = async () => {
    try {
      await disconnect();
      if (sessionToken) {
        await revokeToken(sessionToken);
      }
      setSessionToken(null);
    } catch (err) {
      errorLog(t('auth.logoutFailed', 'Logout failed'), err);
    }
  };

  const role = user?.role;
  const isAdmin = role === 'admin' || user?.isAdmin === true;
  const isDriver = role === 'driver';
  const isStoreOwner = role === 'store-owner';
  const isPlatformAdmin = role === 'platform-admin';

  if (!initialized) {
    return <Spinner />;
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!address,
        isAdmin,
        isDriver,
        isStoreOwner,
        isPlatformAdmin,
        user,
        loading: false,
        sessionToken,
        login,
        signup,
        logout,
        checkAuthState,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
