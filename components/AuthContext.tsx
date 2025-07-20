import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { executeSql } from '../lib/sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_USERNAME = process.env.EXPO_PUBLIC_ADMIN_USERNAME;
const JWT_SECRET = process.env.EXPO_PUBLIC_JWT_SECRET || 'secret_key';

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
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          const payload: any = jwt.verify(token, JWT_SECRET);
          setSession(token);
          await loadProfile(payload.sub);
        }
      } catch (err) {
        await AsyncStorage.removeItem('auth_token');
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
      const token = jwt.sign({ sub: row.id }, JWT_SECRET);
      await AsyncStorage.setItem('auth_token', token);
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
      const token = jwt.sign({ sub: id }, JWT_SECRET);
      await AsyncStorage.setItem('auth_token', token);
      setSession(token);
      await loadProfile(id);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Signup failed', err);
      setLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    await AsyncStorage.removeItem('auth_token');
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  const checkAuthState = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      try {
        const payload: any = jwt.verify(token, JWT_SECRET);
        setSession(token);
        await loadProfile(payload.sub);
      } catch {
        await AsyncStorage.removeItem('auth_token');
        setSession(null);
        setUser(null);
      }
    } else {
      setSession(null);
      setUser(null);
    }
    setLoading(false);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
