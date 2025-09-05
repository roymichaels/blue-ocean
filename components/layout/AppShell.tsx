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
}

export default function AppShell({ children, showSearch = true }: AppShellProps) {
  const { theme, colors } = useTheme();
  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.canvas} />
        <GlobalHeader showSearch={showSearch} />
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>{children}</View>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

