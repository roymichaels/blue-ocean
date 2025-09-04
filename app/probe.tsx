import React from 'react';
import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '@/ui/ThemeProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function Probe() {
  const { colors } = useTheme();
  return (
    <ErrorBoundary>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
          gap: 12,
        }}
      >
        <Text
          style={{ color: colors.text.primary, fontSize: 24, fontWeight: '700' }}
        >
          PROBE OK
        </Text>
        <Link
          href="/categories"
          style={{ color: colors.gold, fontWeight: '700' }}
        >
          Open Tabs → Categories
        </Link>
      </View>
    </ErrorBoundary>
  );
}

