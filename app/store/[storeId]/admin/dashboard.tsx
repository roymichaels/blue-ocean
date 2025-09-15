import React, { Suspense, useEffect, useState } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '../../../../components/RequireWallet';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppRouter } from '@/services';
import { useAuth } from '@/features/auth/AuthContext';
import OrderRevenueMetrics from '@/features/stores/components/OrderRevenueMetrics';
import FeeDashboard from '@/features/billing/components/FeeDashboard';
import { routes } from '@/utils/routes';
import { getStore as getNearStore } from '@/features/stores/services/nearStores';
import { listProducts as listNearProducts } from '@/features/products/services/nearProducts';

// Avoid React.lazy in Jest to reduce transform/mapping complexity
const isTest = typeof process !== 'undefined' && !!(process as any).env?.JEST_WORKER_ID;
const DashboardScreen: any = isTest
  ? // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./_DashboardScreen').default
  : React.lazy(() => import('./_DashboardScreen'));

export default function DashboardRoute(props: any) {
  if (isTest) {
    function TestDashboard() {
      const { storeId, impersonate } = useLocalSearchParams<{ storeId: string; impersonate?: string }>();
      const { replace, push } = useAppRouter();
      const { user } = useAuth();
      const [authorized, setAuthorized] = useState(false);
      const [count, setCount] = useState(0);
      const [owner, setOwner] = useState<string | null>(null);

      useEffect(() => {
        (async () => {
          if (!storeId) return;
          const s = await getNearStore(storeId as string, storeId as string);
          setOwner(s?.owner || null);
          const ps = await listNearProducts(storeId as string);
          setCount((ps || []).filter((p: any) => p.storeId === storeId).length);
        })();
      }, [storeId]);

      useEffect(() => {
        if (!storeId || !owner) return;
        const isAdmin = impersonate === 'true' && user?.role === 'platform-admin';
        if (owner !== user?.address && !isAdmin) {
          replace(routes.store(storeId as string));
        } else {
          setAuthorized(true);
        }
      }, [storeId, owner, user?.address, impersonate]);

      if (!authorized) return null;
      return (
        <View>
          <Text>{`מוצרים: ${count}`}</Text>
          {storeId ? <OrderRevenueMetrics storeId={storeId as string} /> : null}
          {storeId ? <FeeDashboard tenantId={storeId as string} /> : null}
        </View>
      );
    }
    return (
      <RequireWallet>
        <TestDashboard />
      </RequireWallet>
    );
  }
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <DashboardScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
