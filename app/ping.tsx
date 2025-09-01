import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

export default function Ping() {
  const { colors } = useTheme();
  return (
    <ErrorBoundary>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ fontSize: 24, color: colors.text.primary }}>PING ✅</Text>
      </View>
    </ErrorBoundary>
  );
}

