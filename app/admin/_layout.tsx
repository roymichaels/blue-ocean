import { Stack } from 'expo-router';
import ErrorBoundary from '@shared/ErrorBoundary';
import RequireWallet from '../../components/RequireWallet';

export default function AdminLayout() {
  return (
    <RequireWallet>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="overview" />
          <Stack.Screen name="stores" />
          <Stack.Screen name="stores/[storeId]" />
          <Stack.Screen name="user-directory" />
          <Stack.Screen name="fees" />
          <Stack.Screen name="compliance" />
          <Stack.Screen name="settings" />
        </Stack>
      </ErrorBoundary>
    </RequireWallet>
  );
}
