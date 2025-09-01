import { Slot } from 'expo-router';
import { TenantProvider } from '../contexts/TenantContext';

export default function RootLayout() {
  return (
    <TenantProvider>
      <Slot />
    </TenantProvider>
  );
}
