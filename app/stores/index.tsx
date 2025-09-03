import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function StoresScreen() {
  const { colors } = useTheme();
  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text.primary }}>Stores</Text>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
});
