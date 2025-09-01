import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/features/auth/AuthContext';

export default function useRequirePlatformAdmin() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role !== 'platform-admin') {
      router.replace('/');
    }
  }, [user]);
}

