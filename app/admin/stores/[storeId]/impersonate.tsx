import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import useRequirePlatformAdmin from '@/hooks/useRequirePlatformAdmin';

export default function ImpersonateStore() {
  useRequirePlatformAdmin();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();

  useEffect(() => {
    if (storeId) {
      router.replace(`/store/${storeId}/admin/dashboard?impersonate=true`);
    }
  }, [storeId]);

  return null;
}
