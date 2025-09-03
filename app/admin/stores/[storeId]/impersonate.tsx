import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import useAppRouter from 'hooks/useAppRouter';
import useRequirePlatformAdmin from '@/hooks/useRequirePlatformAdmin';
import RequireWallet from '@/components/RequireWallet';

export default function ImpersonateStore() {
  useRequirePlatformAdmin();
  const { replace } = useAppRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();

  useEffect(() => {
    if (storeId) {
      replace(`/store/${storeId}/admin/dashboard?impersonate=true`);
    }
  }, [storeId, replace]);

  return <RequireWallet>{null}</RequireWallet>;
}
