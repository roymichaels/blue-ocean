import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from 'react';
import usersAgent from '../agents/users-agent';
import bcrypt from 'bcryptjs';
import JWT from 'expo-jwt';
import { savePrivateKey, getPrivateKey } from '../utils/privateKeyStorage';
import { getPublicKeyAsync, utils as edUtils, etc as edBytes } from '@noble/ed25519';
import { saveToken, getToken, removeToken } from '../utils/tokenStorage';
import { isTokenValid, refreshToken } from '../utils/jwtSession';
import config from '../utils/appConfig';
import { useConfig } from '../contexts/ConfigContext';
import { isWakuConfigured } from '../lib/waku/isWakuConfigured';

async function getAdminUsernames(): Promise<string[]> {
  const raw = config.EXPO_PUBLIC_ADMIN_USERNAME || '';
  if (!raw) {
    console.warn('Admin username not configured; defaulting to "admin"');
    return ['admin'];
  }
  return raw
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}
async function getJwtSecret(): Promise<string | null> {
  return config.EXPO_PUBLIC_JWT_SECRET || null;
}

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
  const { config: cfg } = useConfig();
  const wakuReady = useRef(false);

  useEffect(() => {
    const init = async () => {
      try {
        await usersAgent.whenReady();
        let token = await getToken();
        if (token && (await isTokenValid(token))) {
          const JWT_SECRET = await getJwtSecret();
            if (JWT_SECRET) {
              const payload: any = JWT.decode(token, JWT_SECRET);
              setSession(token);
              if (payload?.sub) {
                await usersAgent.whenReady();
                await loadProfile(payload.sub);
              }
            } else {
            await removeToken();
          }
        } else {
          await removeToken();
          const priv = await getPrivateKey();
          if (priv) {
            const pub = await getPublicKeyAsync(edBytes.hexToBytes(priv));
            const pubHex = edBytes.bytesToHex(pub);
            const row = usersAgent
              .getAll()
              .find((u) => u.publicKey === pubHex);
            if (row) {
              const JWT_SECRET = await getJwtSecret();
              if (JWT_SECRET) {
                token = JWT.encode(
                  {
                    sub: row.id,
                    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
                  },
                  JWT_SECRET,
                );
                await saveToken(token);
                setSession(token);
                await loadProfile(row.id);
              }
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadProfile = async (uid: string) => {
    const data = usersAgent.get(uid);
    if (data) {
      setUser(data);
    } else {
      setUser({ id: uid, role: 'user', username: '', displayName: '', isAdmin: false });
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const row = usersAgent.getAll().find((u) => u.username === username);
      if (!row) {
        setLoading(false);
        return false;
      }
      const match = await bcrypt.compare(password, row.passwordHash || '');
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
      const pub = await getPublicKeyAsync(priv);
      const privateKey = edBytes.bytesToHex(priv);
      const publicKey = edBytes.bytesToHex(pub);
      await savePrivateKey(privateKey);
      const existing = usersAgent.getAll().find((u) => u.username === username);
      if (existing) {
        throw new UsernameTakenError();
      }
      await usersAgent.add({
        id,
        username,
        displayName,
        role,
        publicKey,
        isAdmin: role === 'admin',
        isDriver: (role as string) === 'driver',
        passwordHash: hash,
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

  useEffect(() => {
    (async () => {
      const ready = await isWakuConfigured();
      if (ready && !wakuReady.current) {
        wakuReady.current = true;
        if (user) {
          usersAgent.update(user).catch((e) => {
            console.error('Failed broadcasting user via Waku', e);
          });
        }
      } else if (!ready) {
        wakuReady.current = false;
      }
    })();
  }, [cfg.EXPO_PUBLIC_USE_WAKU, cfg.EXPO_PUBLIC_WAKU_SECRET, user]);

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
