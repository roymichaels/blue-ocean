import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import { useRequirePlatformAdmin } from '@/services';
import RequireWallet from '../../components/RequireWallet';
import ErrorBoundary from '@/shared/ErrorBoundary';

export default function Compliance() {
  useRequirePlatformAdmin();
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <ErrorBoundary>
      <RequireWallet>
        <View style={[styles.container, { backgroundColor: colors.background }]}> 
          <Text style={{ color: colors.text.primary }}>{t('admin.complianceSoon')}</Text>
        </View>
      </RequireWallet>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
