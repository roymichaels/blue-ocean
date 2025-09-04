import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import useRequirePlatformAdmin from '../../hooks/useRequirePlatformAdmin';
import RequireWallet from '../../components/RequireWallet';

export default function AdminOverview() {
  useRequirePlatformAdmin();
  const { colors } = useTheme();
  return (
    <RequireWallet>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Platform Overview</Text>
      </View>
    </RequireWallet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600' },
});
