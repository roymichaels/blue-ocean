import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { executeSql } from '../lib/sqlite';
import bcrypt from 'bcryptjs';
import JWT from 'expo-jwt';
import { saveToken, getToken, removeToken } from '../utils/tokenStorage';
import { isTokenValid, refreshToken } from '../utils/jwtSession';

const ADMIN_USERNAME = process.env.EXPO_PUBLIC_ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.EXPO_PUBLIC_ADMIN_PASSWORD || 'admin';
const JWT_SECRET = process.env.EXPO_PUBLIC_JWT_SECRET || 'secret_key';

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

  const ensureAdminAccount = async () => {
    if (!ADMIN_USERNAME) return;
    const res = await executeSql(
      "SELECT COUNT(*) as count FROM users WHERE role='admin'",
    );
    const count = (res.rows as any)._array?.[0]?.count || 0;
    if (count === 0) {
      const id = `user_${Date.now()}`;
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await executeSql(
        'INSERT INTO users (id, username, password_hash, display_name, role) VALUES (?,?,?,?,?)',
        [id, ADMIN_USERNAME, hash, 'Admin', 'admin'],
      );
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await ensureAdminAccount();
        const token = await getToken();
        if (token && isTokenValid(token)) {
          const payload: any = JWT.decode(token, JWT_SECRET);
          setSession(token);
          if (payload?.sub) {
            await loadProfile(payload.sub);
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
    const result = await executeSql('SELECT * FROM users WHERE id = ?', [uid]);
    const data = (result.rows as any)._array?.[0];
    if (data) {
      setUser({
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        role: data.role,
      });
    } else {
      setUser({ id: uid, role: 'user', username: '', displayName: '' });
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await executeSql('SELECT * FROM users WHERE username = ?', [username]);
      const row = (res.rows as any)._array?.[0];
      if (!row) {
        setLoading(false);
        return false;
      }
      const match = await bcrypt.compare(password, row.password_hash);
      if (!match) {
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
      const role = ADMIN_USERNAME && username === ADMIN_USERNAME ? 'admin' : 'user';
      await executeSql(
        'INSERT INTO users (id, username, password_hash, display_name, role) VALUES (?,?,?,?,?)',
        [id, username, hash, displayName, role],
      );
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
    if (token && isTokenValid(token)) {
      const payload: any = JWT.decode(token, JWT_SECRET);
      setSession(token);
      if (payload?.sub) {
        await loadProfile(payload.sub);
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
    if (token && isTokenValid(token)) {
      const newToken = refreshToken(token);
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
