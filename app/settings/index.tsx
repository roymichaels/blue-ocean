import React from 'react';
import { View, Switch, StyleSheet, Alert } from 'react-native';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import { Heading, Text, Card, Button } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { useCurrency } from '@/contexts/CurrencyContext';
import { spacing } from '@/ui/tokens';
import { useLaunchGate } from '@/features/launchGate';

export default function SettingsScreen() {
  const { colors, theme, setTheme } = useTheme();
  const { t, currentLanguage, setLanguage } = useLanguage();
  const { currencySymbol, setCurrencySymbol } = useCurrency();
  const {
    biometricEnabled,
    biometricAvailable,
    enableBiometric,
    startPinReset,
    pinSet,
  } = useLaunchGate();

  const handleThemeToggle = (value: boolean) => {
    void setTheme(value ? 'dark' : 'light');
  };

  const handleLanguageChange = (lang: 'en' | 'he') => {
    void setLanguage(lang);
  };

  const handleCurrencyChange = (symbol: string) => {
    void setCurrencySymbol(symbol);
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      await enableBiometric(value);
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      Alert.alert(
        t('settings.biometricUnavailableTitle', 'Biometric unavailable'),
        message ||
          t(
            'settings.biometricUnavailable',
            'Your device does not support biometric unlock.',
          ),
      );
    }
  };

  const handleResetPin = async () => {
    await startPinReset();
  };

  return (
    <ScrollArea backgroundColor={colors.canvas}>
      <Container>
        <Heading size="xl">{t('navigation.settings', 'Settings')}</Heading>
        <View style={{ height: spacing.spacer12 }} />
        <Stack gap="spacer20">
          <Card>
            <Stack gap="spacer12">
              <Heading size="md" style={{ color: colors.text.primary }}>
                {t('settings.appearance', 'Appearance')}
              </Heading>
              <View style={styles.row}>
                <Text style={{ color: colors.text.primary }}>{t('settings.darkMode', 'Dark mode')}</Text>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={handleThemeToggle}
                  thumbColor={theme === 'dark' ? colors.gold : colors.surface.secondary}
                  accessibilityLabel={t('settings.darkModeToggle', 'Toggle dark mode')}
                />
              </View>
              <Text style={{ color: colors.text.secondary }}>
                {t(
                  'settings.accessibilityHint',
                  'Dark mode is optimised for WCAG 2.2 AA contrast across the entire experience.',
                )}
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="spacer12">
              <Heading size="md" style={{ color: colors.text.primary }}>
                {t('settings.language', 'Language')}
              </Heading>
              <Text style={{ color: colors.text.secondary }}>
                {t('settings.languageHint', 'Choose your default interface language.')}
              </Text>
              <View style={styles.buttonRow}>
                <Button
                  title="English"
                  onPress={() => handleLanguageChange('en')}
                  disabled={currentLanguage === 'en'}
                />
                <Button
                  title="עברית"
                  onPress={() => handleLanguageChange('he')}
                  disabled={currentLanguage === 'he'}
                />
              </View>
            </Stack>
          </Card>

          <Card>
            <Stack gap="spacer12">
              <Heading size="md" style={{ color: colors.text.primary }}>
                {t('settings.currency', 'Currency')}
              </Heading>
              <Text style={{ color: colors.text.secondary }}>
                {t(
                  'settings.currencyHint',
                  'All totals are shown using your preferred currency symbol.',
                )}
              </Text>
              <View style={styles.buttonRow}>
                {['₪', '$', '€'].map((symbol) => (
                  <Button
                    key={symbol}
                    title={`${symbol} ${t('settings.useSymbol', 'Use symbol')}`}
                    onPress={() => handleCurrencyChange(symbol)}
                    disabled={currencySymbol === symbol}
                  />
                ))}
              </View>
              <Text style={{ color: colors.text.secondary }}>
                {t('settings.currentCurrency', 'Current currency')}: {currencySymbol}
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="spacer12">
              <Heading size="md" style={{ color: colors.text.primary }}>
                {t('settings.accessibility', 'Accessibility & privacy')}
              </Heading>
              <Text style={{ color: colors.text.secondary }}>
                {t(
                  'settings.accessibilityDescription',
                  'Anonymous browsing is supported. We only store preferences like theme and currency locally on your device.',
                )}
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="spacer12">
              <Heading size="md" style={{ color: colors.text.primary }}>
                {t('settings.security', 'Security')}
              </Heading>
              <Text style={{ color: colors.text.secondary }}>
                {t(
                  'settings.securityDescription',
                  'Enable biometrics and reset your app PIN.',
                )}
              </Text>
              <View style={styles.row}>
                <Text style={{ color: colors.text.primary }}>
                  {t('settings.enableBiometric', 'Use biometric unlock')}
                </Text>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  disabled={!biometricAvailable || !pinSet}
                  thumbColor={biometricEnabled ? colors.gold : colors.surface.secondary}
                  accessibilityLabel={t('settings.enableBiometric', 'Use biometric unlock')}
                />
              </View>
              {!biometricAvailable && (
                <Text style={{ color: colors.text.secondary }}>
                  {t(
                    'settings.biometricUnavailable',
                    'Biometric unlock is not available on this device.',
                  )}
                </Text>
              )}
              {!pinSet && (
                <Text style={{ color: colors.text.secondary }}>
                  {t('settings.pinRequired', 'Set up a PIN before enabling biometrics.')}
                </Text>
              )}
              <Button onPress={handleResetPin} disabled={!pinSet}>
                {t('settings.resetPin', 'Reset PIN')}
              </Button>
              <Text style={{ color: colors.text.secondary }}>
                {t(
                  'settings.resetPinHint',
                  'Resetting your PIN requires biometric verification or a wallet signature.',
                )}
              </Text>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </ScrollArea>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spacer12,
  },
});

