import { Stack } from 'expo-router';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function StoreAdminLayout() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
