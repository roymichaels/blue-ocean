import React from 'react';
import { Slot } from 'expo-router';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function StorefrontLayout() {
  return (
    <ErrorBoundary>
      <Slot />
    </ErrorBoundary>
  );
}
