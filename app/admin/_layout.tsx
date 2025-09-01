import { Stack } from 'expo-router';
import chain from '../../services/chain';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function AdminLayout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="overview" />
        <Stack.Screen name="stores" />
        <Stack.Screen name="stores/[storeId]" />
        <Stack.Screen name="user-directory" />
        <Stack.Screen name="fees" />
        {chain === 'near' && <Stack.Screen name="near" />}
        <Stack.Screen name="compliance" />
        <Stack.Screen name="settings" />
      </Stack>
    </ErrorBoundary>
  );
}
