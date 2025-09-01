import React from 'react';
import { Slot } from 'expo-router';
import AppProviders from '../providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <React.Suspense fallback={null}>
        <Slot />
      </React.Suspense>
    </AppProviders>
  );
}
