import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { store } from '../lib/memoryStore';
import bcrypt from 'bcryptjs';
import JWT from 'expo-jwt';
import * as SecureStore from 'expo-secure-store';
import { getPublicKey, utils as edUtils } from '@noble/ed25519';
import { saveToken, getToken, removeToken } from '../utils/tokenStorage';
import { isTokenValid, refreshToken } from '../utils/jwtSession';
import { requireConfig } from '../utils/env';
import { getTenant } from '../constants/tenant';

async function getAdminUsernames(): Promise<string[]> {
  try {
    const raw = await requireConfig('EXPO_PUBLIC_ADMIN_USERNAME');
    return raw
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
  } catch (err) {
    console.warn('Admin username not configured; defaulting to "admin"', err);
    return ['admin'];
  }
}
let jwtSecretPromise: Promise<string | null> | null = null;
async function getJwtSecret(): Promise<string | null> {
  if (!jwtSecretPromise) {
    jwtSecretPromise = requireConfig('EXPO_PUBLIC_JWT_SECRET').catch((err) => {
      console.error('JWT secret missing', err);
      return null;
    });
  }
  return jwtSecretPromise;
}
const PRIVATE_KEY_KEY = 'ed25519_private_key';

export class UsernameTakenError extends Error {
  constructor() {
    super('usernameTaken');
    this.name = 'UsernameTakenError';
  }
}

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  user: any | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isAdmin: false,
  isDriver: false,
  user: null,
  loading: true,
  login: async () => false,
  signup: async () => false,
  logout: async () => {},
  checkAuthState: async () => {},
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps { children: ReactNode }

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const token = await getToken();
        if (token && (await isTokenValid(token))) {
          const JWT_SECRET = await getJwtSecret();
          if (JWT_SECRET) {
            const payload: any = JWT.decode(token, JWT_SECRET);
            setSession(token);
            if (payload?.sub) {
              await loadProfile(payload.sub);
            }
          } else {
            await removeToken();
          }
        } else {
          await removeToken();
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadProfile = async (uid: string) => {
    const data = store.users.get(uid);
    if (data) {
      setUser({
        id: data.id,
        username: data.username,
        displayName: data.displayName,
        role: data.role,
        publicKey: data.publicKey,
      });
    } else {
      setUser({ id: uid, role: 'user', username: '', displayName: '' });
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const row = Array.from(store.users.values()).find(u => u.username === username);
      if (!row) {
        setLoading(false);
        return false;
      }
      const match = await bcrypt.compare(password, row.passwordHash);
      if (!match) {
        setLoading(false);
        return false;
      }
      const JWT_SECRET = await getJwtSecret();
      if (!JWT_SECRET) {
        console.error('JWT secret missing; cannot login');
        setLoading(false);
        return false;
      }
      const token = JWT.encode(
        { sub: row.id, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 },
        JWT_SECRET,
      );
      await saveToken(token);
      setSession(token);
      await loadProfile(row.id);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Login failed', err);
      setLoading(false);
      return false;
    }
  };

  const signup = async (
    username: string,
    password: string,
    displayName: string,
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const hash = await bcrypt.hash(password, 10);
      const id = `user_${Date.now()}`;
      const isAdminUsername = (await getAdminUsernames()).includes(username);
      const role = isAdminUsername ? 'admin' : 'user';
      const priv = edUtils.randomPrivateKey();
      const pub = await getPublicKey(priv);
      const privateKey = edUtils.bytesToHex(priv);
      const publicKey = edUtils.bytesToHex(pub);
      await SecureStore.setItemAsync(PRIVATE_KEY_KEY, privateKey);
      store.users.set(id, {
        id,
        username,
        passwordHash: hash,
        displayName,
        role,
        publicKey,
      });
      const tenant = await getTenant();
      store.userProfiles.set(id, {
        id,
        tenant_id: tenant,
        username,
        displayName,
        role,
        publicKey,
      });
      const JWT_SECRET = await getJwtSecret();
      if (!JWT_SECRET) {
        console.error('JWT secret missing; cannot signup');
        setLoading(false);
        return false;
      }
      const token = JWT.encode(
        { sub: id, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 },
        JWT_SECRET,
      );
      await saveToken(token);
      setSession(token);
      await loadProfile(id);
      setLoading(false);
      return true;
    } catch (err: any) {
      setLoading(false);
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        (err as Error).message.includes('UNIQUE constraint failed: users.username')
      ) {
        throw new UsernameTakenError();
      }
      console.error('Signup failed', err);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    await removeToken();
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  const checkAuthState = async () => {
    setLoading(true);
    const token = await getToken();
    if (token && (await isTokenValid(token))) {
      const JWT_SECRET = await getJwtSecret();
      if (JWT_SECRET) {
        const payload: any = JWT.decode(token, JWT_SECRET);
        setSession(token);
        if (payload?.sub) {
          await loadProfile(payload.sub);
        }
      } else {
        await removeToken();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
    } else {
      await removeToken();
      setSession(null);
      setUser(null);
    }
    setLoading(false);
  };

  const refreshSession = async () => {
    const token = await getToken();
    if (token && (await isTokenValid(token))) {
      const newToken = await refreshToken(token);
      if (newToken) {
        await saveToken(newToken);
        setSession(newToken);
      }
    }
  };

  const value: AuthContextType = {
    isLoggedIn: !!session,
    isAdmin: user?.role === 'admin',
    isDriver: user?.role === 'driver',
    user,
    loading,
    login,
    signup,
    logout,
    checkAuthState,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
