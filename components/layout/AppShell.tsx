import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/ui/ThemeProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';
import GlobalHeader from '../GlobalHeader';

interface AppShellProps {
  children: React.ReactNode;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function AppShell({
  children,
  showSearch = true,
  searchQuery,
  onSearchChange,
}: AppShellProps) {
  const { theme, colors } = useTheme();
  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.canvas} />
        <GlobalHeader
          showSearch={showSearch}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>{children}</View>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

