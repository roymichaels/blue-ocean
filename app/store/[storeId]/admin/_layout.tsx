import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { isStoreOwner } from '../../../../utils/authRoles';

export default function StoreAdminLayout() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    (async () => {
      if (!storeId || !(await isStoreOwner(storeId))) {
        router.replace('/');
        return;
      }
      setAuthorized(true);
    })();
  }, [storeId]);

  if (!authorized) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="products" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="kyc-approvals" />
      <Stack.Screen name="user-management" />
      <Stack.Screen name="pricing-tiers" />
      <Stack.Screen name="deliveries" />
      <Stack.Screen name="bulk-upload" />
      <Stack.Screen name="disputes" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
