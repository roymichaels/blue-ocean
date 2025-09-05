import React from 'react';
import { Slot } from 'expo-router';

// Root layout renders only the current route. Providers live in App.tsx.
export default function RootLayout() {
  return <Slot />;
}
