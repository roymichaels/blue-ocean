import { useEffect } from 'react';
import { useAppRouter } from './useAppRouter';
import { useAuth } from '@/features/auth/AuthContext';

export function useRequirePlatformAdmin() {
  const { user } = useAuth();
  const { replace } = useAppRouter();

  useEffect(() => {
    if (user?.role !== 'platform-admin') {
      replace('/');
    }
  }, [user, replace]);
}

export default useRequirePlatformAdmin;

