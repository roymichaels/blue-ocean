import React from 'react';
import { Slot } from 'expo-router';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function CategoryLayout() {
  return (
    <ErrorBoundary>
      <Slot />
    </ErrorBoundary>
  );
}
