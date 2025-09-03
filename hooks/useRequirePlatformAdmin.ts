import { useEffect } from 'react';
import useAppRouter from 'hooks/useAppRouter';
import { useAuth } from '@features/auth/AuthContext';

export default function useRequirePlatformAdmin() {
  const { user } = useAuth();
  const { replace } = useAppRouter();

  useEffect(() => {
    if (user?.role !== 'platform-admin') {
      replace('/');
    }
  }, [user, replace]);
}

