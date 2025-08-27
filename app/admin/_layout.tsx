import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { isPlatformAdmin } from '../../utils/authRoles';

export default function AdminLayout() {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    (async () => {
      if (!(await isPlatformAdmin())) {
        router.replace('/');
        return;
      }
      setAuthorized(true);
    })();
  }, []);

  if (!authorized) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="kyc-approvals" />
      <Stack.Screen name="user-management" />
      <Stack.Screen name="pricing-tiers" />
      <Stack.Screen name="deliveries" />
      <Stack.Screen name="bulk-upload" />
    </Stack>
  );
}
