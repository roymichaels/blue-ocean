import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const ADMIN_USERNAME = process.env.EXPO_PUBLIC_ADMIN_USERNAME;

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
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) await loadProfile(session.user.id);
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
      } else {
        setUser(null);
      }
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('matrix_user_id', uid)
      .single();

    if (data) {
      let profile = data;

      if (ADMIN_USERNAME && data.app_username === ADMIN_USERNAME && data.role !== 'admin') {
        const { data: updated } = await supabase
          .from('user_profiles')
          .update({ role: 'admin' })
          .eq('matrix_user_id', uid)
          .select()
          .single();
        profile = updated || data;
      }

      // Map DB fields to expected camelCase properties
      setUser({
        ...profile,
        username: profile.app_username,
        displayName: profile.display_name,
      });
    } else {
      // Provide minimal guest profile structure
      setUser({ id: uid, role: 'user', username: '', displayName: '' });
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    const email = `${username}@user.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      setLoading(false);
      return false;
    }
    await loadProfile(data.session.user.id);
    if (ADMIN_USERNAME && username === ADMIN_USERNAME) {
      await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('matrix_user_id', data.session.user.id);
      await loadProfile(data.session.user.id);
    }
    setLoading(false);
    return true;
  };

  const signup = async (username: string, password: string, displayName: string): Promise<boolean> => {
    setLoading(true);
    const email = `${username}@user.local`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error || !data.user) {
      setLoading(false);
      return false;
    }
    const role = ADMIN_USERNAME && username === ADMIN_USERNAME ? 'admin' : 'user';
    await supabase.from('user_profiles').insert({
      matrix_user_id: data.user.id,
      app_username: username,
      email,
      display_name: displayName,
      role
    });
    await loadProfile(data.user.id);
    setLoading(false);
    return true;
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  const checkAuthState = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    if (session) await loadProfile(session.user.id);
    else setUser(null);
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
