import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, username: string, displayName: string) => Promise<boolean>;
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
      setUser(data);
    } else {
      setUser({ id: uid, role: 'user' });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      setLoading(false);
      return false;
    }
    await loadProfile(data.session.user.id);
    setLoading(false);
    return true;
  };

  const signup = async (email: string, password: string, username: string, displayName: string): Promise<boolean> => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      setLoading(false);
      return false;
    }
    await supabase.from('user_profiles').insert({
      matrix_user_id: data.user.id,
      app_username: username,
      email,
      display_name: displayName,
      role: 'user'
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
