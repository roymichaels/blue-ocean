import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlobalHeader from '../GlobalHeader';

interface AppShellProps {
  children: React.ReactNode;
  showSearch?: boolean;
}

export default function AppShell({ children, showSearch = true }: AppShellProps) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GlobalHeader showSearch={showSearch} />
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}

