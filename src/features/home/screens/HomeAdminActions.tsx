import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Container } from '@/ui/layout';
import { Spinner } from '@/ui/primitives';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { styles } from './HomeAdminActions.styles';

type Props = {
  onClearData: () => void;
  loading?: boolean;
};

export default function HomeAdminActions({ onClearData, loading = false }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  if (!__DEV__) {
    return null;
  }

  return (
    <Container style={styles.container}>
      <TouchableOpacity
        style={styles.clearDataLink}
        onPress={onClearData}
        disabled={loading}
      >
        {loading && <Spinner style={styles.buttonSpinner} />}
        <Text style={[styles.clearDataText, { color: colors.text.secondary }]}>
          {t('home.clearLocalData')}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.helperText, { color: colors.text.secondary }]}>
        {t('home.clearLocalDataHelper')}
      </Text>
    </Container>
  );
}
