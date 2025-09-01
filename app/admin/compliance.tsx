import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import useRequirePlatformAdmin from '../../hooks/useRequirePlatformAdmin';
import RequireWallet from '../../components/RequireWallet';

export default function Compliance() {
  useRequirePlatformAdmin();
  const { colors } = useTheme();
  return (
    <RequireWallet>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text.primary }}>Compliance tools coming soon.</Text>
      </View>
    </RequireWallet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
