import { Stack } from 'expo-router';

export default function StoreAdminLayout() {
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
