import React from 'react';
import { Slot } from 'expo-router';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function UserLayout() {
  return (
    <ErrorBoundary>
      <Slot />
    </ErrorBoundary>
  );
}
