import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';

export default function StoresScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={{ color: colors.text.primary }}>{t('stores.title')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
});
