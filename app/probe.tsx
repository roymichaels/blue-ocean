import React from 'react';
import { View, Text } from 'react-native';
import { useAppRouter } from '@/services';
import { useTheme } from '@/ui/ThemeProvider';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function Probe() {
  const { colors } = useTheme();
  const { push } = useAppRouter();
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
        <Text
          onPress={() => push('/categories') /* eslint-disable-line no-restricted-syntax */}
          style={{ color: colors.gold, fontWeight: '700' }}
        >
          Open Tabs → Categories
        </Text>
      </View>
    </ErrorBoundary>
  );
}

