import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function LoadingView({ message }: { message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <ActivityIndicator size="large" color={colors.gold} />
      {message ? (
        <Text style={{ color: colors.text.primary, marginTop: 12 }}>{message}</Text>
      ) : null}
    </View>
  );
}

