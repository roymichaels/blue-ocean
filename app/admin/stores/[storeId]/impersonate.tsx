import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { isPlatformAdmin } from '../../../../utils/authRoles';

export default function ImpersonateStore() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();

  useEffect(() => {
    (async () => {
      if (!storeId || !(await isPlatformAdmin())) {
        router.replace('/');
        return;
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('asStoreId', storeId);
      }
      router.replace(`/store/${storeId}/admin/dashboard`);
    })();
  }, [storeId]);

  return null;
}
