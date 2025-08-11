import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="kyc-approvals" />
      <Stack.Screen name="user-management" />
      <Stack.Screen name="pricing-tiers" />
      <Stack.Screen name="deliveries" />
    </Stack>
  );
}
