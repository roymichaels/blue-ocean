import React from 'react';
import { Slot } from 'expo-router';

// Root layout renders only the current route.
// No wrappers allowed before <Slot />; providers live in App.tsx.
export default () => <Slot />;
