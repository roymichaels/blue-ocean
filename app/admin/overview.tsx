import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import { useRequirePlatformAdmin } from '@/services';
import RequireWallet from '../../components/RequireWallet';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function AdminOverview() {
  useRequirePlatformAdmin();
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <ErrorBoundary>
      <RequireWallet>
        <View style={[styles.container, { backgroundColor: colors.background }]}> 
          <Text style={[styles.title, { color: colors.text.primary }]}>{t('admin.platformOverview')}</Text>
        </View>
      </RequireWallet>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '600' },
});
