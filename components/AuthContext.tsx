import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import { MatrixService } from '../services/matrix';
import { supabase } from '../services/supabase';
import { Platform } from 'react-native';
import MatrixUserModal from './MatrixUserModal';
import InfoModal from './InfoModal';

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  user: any | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, displayName: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthState: () => void;
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
  checkAuthState: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMatrixUserModal, setShowMatrixUserModal] = useState(false);
  const [matrixUsername, setMatrixUsername] = useState('');
  const [matrixModalLoading, setMatrixModalLoading] = useState(false);
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error' as 'success' | 'error' | 'info' | 'warning'
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    
    // Check initial auth state on app startup
    checkAuthState();

    // Set up auth state listener
    const matrixService = MatrixService.getInstance();
    const handleAuthChange = (loggedIn: boolean, currentUser: any) => {
      if (mounted.current) {
        setIsLoggedIn(loggedIn);
        setIsAdmin(currentUser?.isAdmin || false);
        setIsDriver(currentUser?.isDriver || false);
        setUser(currentUser);
        setLoading(false);
      }
    };

    matrixService.addAuthStateListener(handleAuthChange);

    return () => {
      mounted.current = false;
      matrixService.removeAuthStateListener(handleAuthChange);
    };
  }, []);

  const checkAuthState = async () => {
    try {
      // Check Matrix auth first - this is our primary auth system
      const matrixService = MatrixService.getInstance();
      
      // Refresh auth state from storage first
      await matrixService.refreshAuthFromStorage();
      
      // Validate that stored auth is still valid
      const isValid = await matrixService.validateStoredAuth();
      
      if (isValid) {
        const loggedIn = matrixService.isLoggedIn();
        const currentUser = matrixService.getCurrentUser();
        
        if (mounted.current) {
          setIsLoggedIn(loggedIn);
          setIsAdmin(matrixService.isAdmin());
          setIsDriver(matrixService.isDriver());
          setUser(currentUser);
          setLoading(false);
        }
        
        // After Matrix auth is confirmed, we can fetch additional user data from Supabase
        // but this doesn't affect the auth state
        if (loggedIn && currentUser) {
          try {
            const { data: userProfiles } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('matrix_user_id', currentUser.id);
              
            // Handle case where user profile exists
            if (userProfiles && userProfiles.length > 0 && mounted.current) {
              const userProfile = userProfiles[0];
              
              // Enhance user object with Supabase data
              setUser((prev: any) => ({
                ...prev,
                displayName: userProfile.display_name,
                isDriver: userProfile.role === 'driver',
                role: userProfile.role,
                kycStatus: userProfile.kyc_status,
                customerTier: userProfile.customer_tier
              }));
            }
            // If no user profile exists, that's okay - user might need to complete profile setup
          } catch (supabaseError) {
            console.error('Error fetching user profile from Supabase:', supabaseError);
            // This doesn't affect auth state, just additional user data
          }
        }
      } else {
        // Auth is invalid, clear state
        if (mounted.current) {
          setIsLoggedIn(false);
          setIsAdmin(false);
          setIsDriver(false);
          setUser(null);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      if (mounted.current) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setIsDriver(false);
        setUser(null);
        setLoading(false);
      }
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    if (mounted.current) {
      setLoading(true);
    }
    try {
      // Use Matrix login - this is our only authentication system
      const matrixService = MatrixService.getInstance();
      const success = await matrixService.login(username, password);
      
      if (success) {
        const currentUser = matrixService.getCurrentUser();
        
        // Check if user exists in Supabase
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('matrix_user_id', currentUser.id);
        
        const existingProfile = userProfiles && userProfiles.length > 0 ? userProfiles[0] : null;
        
        if (!existingProfile) {
          // User exists in Matrix but not in Supabase
          // Show modal to collect additional info
          if (mounted.current) {
            setMatrixUsername(username);
            setShowMatrixUserModal(true);
            setLoading(false);
            // Don't set isLoggedIn yet - wait for modal completion
            return false;
          }
        } else {
          // User exists in both Matrix and Supabase
          if (mounted.current) {
            setIsLoggedIn(true);
            setIsAdmin(matrixService.isAdmin() || existingProfile.role === 'admin');
            setIsDriver(existingProfile.role === 'driver');
            setUser({
              ...currentUser,
              displayName: existingProfile.display_name,
              role: existingProfile.role,
              kycStatus: existingProfile.kyc_status,
              customerTier: existingProfile.customer_tier
            });
          }
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      if (mounted.current) {
        setInfoModal({
          visible: true,
          title: 'Login Error',
          message: error instanceof Error ? error.message : 'Failed to login. Please try again.',
          type: 'error'
        });
      }
      return false;
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const handleMatrixUserSubmit = async (displayName: string) => {
    setMatrixModalLoading(true);
    try {
      const matrixService = MatrixService.getInstance();
      const currentUser = matrixService.getCurrentUser();
      
      // Create user profile in Supabase
      const { error } = await supabase
        .from('user_profiles')
        .insert([{
          matrix_user_id: currentUser.id,
          app_username: matrixUsername,
          display_name: displayName,
          role: 'user',
          kyc_status: 'none',
          customer_tier: 'new'
        }]);
      
      if (error) {
        console.error('Error creating user profile:', error);
        setInfoModal({
          visible: true,
          title: 'Error',
          message: 'Failed to create user profile',
          type: 'error'
        });
        return;
      }
      
      // Update user state
      if (mounted.current) {
        setIsLoggedIn(true);
        setIsAdmin(matrixService.isAdmin());
        setIsDriver(false);
        setUser({
          ...currentUser,
          displayName: displayName
        });
      }
      
      setShowMatrixUserModal(false);
    } catch (error) {
      console.error('Error creating user profile:', error);
      setInfoModal({
        visible: true,
        title: 'Error',
        message: 'Failed to create user profile',
        type: 'error'
      });
    } finally {
      setMatrixModalLoading(false);
    }
  };

  const signup = async (username: string, email: string, displayName: string, password: string): Promise<boolean> => {
    if (mounted.current) {
      setLoading(true);
    }
    try {
      const matrixService = MatrixService.getInstance();
      const success = await matrixService.signup(username, email, displayName, password);
      
      if (success) {
        if (mounted.current) {
          setInfoModal({
            visible: true,
            title: 'Success',
            message: 'Account created successfully! You can now log in.',
            type: 'success'
          });
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      if (mounted.current) {
        setInfoModal({
          visible: true,
          title: 'Error',
          message: error instanceof Error ? error.message : 'Registration failed. Please try again.',
          type: 'error'
        });
      }
      return false;
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const logout = async (): Promise<void> => {
    if (mounted.current) {
      setLoading(true);
    }
    try {
      // Logout from Matrix first - this is our primary auth system
      const matrixService = MatrixService.getInstance();
      await matrixService.logout();
      
      // Then logout from Supabase
      await supabase.auth.signOut();
      
      if (mounted.current) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error; // Propagate error to caller
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        isLoggedIn,
        isAdmin,
        isDriver,
        user,
        loading,
        login, 
        signup,
        logout,
        checkAuthState
      }}
    >
      {children}
      <MatrixUserModal
        visible={showMatrixUserModal}
        onClose={() => setShowMatrixUserModal(false)}
        onSubmit={handleMatrixUserSubmit}
        username={matrixUsername}
        loading={matrixModalLoading}
      />
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({...infoModal, visible: false})}
      />
    </AuthContext.Provider>
  );
}