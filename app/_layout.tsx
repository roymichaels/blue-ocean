import React from 'react';
import { Slot } from 'expo-router';
import { TenantProvider } from '../contexts/TenantContext';

export default function RootLayout() {
  return (
    <TenantProvider>
      <React.Suspense fallback={null}>
        <Slot />
      </React.Suspense>
    </TenantProvider>
  );
}
