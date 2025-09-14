import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import StoreCreation from '@/features/stores/components/StoreCreation';
import { useTheme } from '@/ui/ThemeProvider';

export default function CreateStoreRoute() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <StoreCreation />
    </SafeAreaView>
  );
}

