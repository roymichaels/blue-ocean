import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAppRouter } from '@/services';
import { useRequirePlatformAdmin } from '@/services';
import RequireWallet from '../../../../components/RequireWallet';
import { routes } from '@/utils/routes';

export default function ImpersonateStore() {
  useRequirePlatformAdmin();
  const { replace } = useAppRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();

  useEffect(() => {
    if (storeId) {
      replace(routes.storeAdminDashboard(storeId, true));
    }
  }, [storeId, replace]);

  return <RequireWallet>{null}</RequireWallet>;
}
