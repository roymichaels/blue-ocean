import { Stack } from 'expo-router';
import chain from '../../services/chain';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="overview" />
      <Stack.Screen name="stores" />
      <Stack.Screen name="stores/[storeId]" />
      <Stack.Screen name="user-directory" />
      <Stack.Screen name="fees" />
      {chain === 'ton' && <Stack.Screen name="ton" />}
      <Stack.Screen name="compliance" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
