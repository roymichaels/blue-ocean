import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import SmartImage from '@/components/SmartImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Calendar } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/ui/ThemeProvider';
import { useAppInfo } from '@/contexts/AppInfoContext';
import { useLanguage } from '@/ui/ThemeProvider';
import { spacing, typography } from '@/constants/styles';
import { Text, Button } from '@/ui';

const AGE_VERIFICATION_KEY = 'age_verified';

export default function AgeVerificationModal() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const { appName, logoCid } = useAppInfo();
  const { t } = useLanguage();

  useEffect(() => {
    checkAgeVerification();
  }, []);

  const checkAgeVerification = async () => {
    try {
      const verified = await AsyncStorage.getItem(AGE_VERIFICATION_KEY);
      if (!verified) {
        setVisible(true);
      }
    } catch (error) {
      errorLog('Error checking age verification:', error);
      setVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      await AsyncStorage.setItem(AGE_VERIFICATION_KEY, 'true');
      setVisible(false);
    } catch (error) {
      errorLog('Error saving age verification:', error);
    }
  };

  const handleDeny = () => {
    // Show custom modal instead of Alert
    setVisible(false);
    // In a real app, you might want to show another modal or redirect the user
  };

  if (loading || !visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {}}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View
                style={[
                  styles.logoContainer,
                  {
                    backgroundColor: colors.interactive.secondary,
                    borderColor: colors.gold,
                  },
                ]}
              >
                {logoCid ? (
                  <SmartImage uri={logoCid} width={60} height={60} style={styles.logoImage} contentFit="contain" />
                ) : (
                  <Shield size={60} color={colors.gold} />
                )}
              </View>

              <Text style={[styles.platformName, { color: colors.gold }]}>
                {appName || t('ageVerification.platformName')}
              </Text>
              <Text
                style={[
                  styles.platformSubtitle,
                  { color: colors.text.secondary },
                ]}
              >
                {t('ageVerification.platformSubtitle')}
              </Text>
            </View>

            {/* Age Verification Section */}
            <View style={styles.verificationSection}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: colors.interactive.secondary,
                    borderColor: colors.gold,
                  },
                ]}
              >
                <Calendar size={48} color={colors.gold} />
              </View>

              <Text style={[styles.title, { color: colors.text.primary }]}>
                 {t('ageVerification.ageVerification')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                 {t('ageVerification.verificationRequired')}
              </Text>

              <View
                style={[
                  styles.warningBox,
                  {
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderColor: colors.status.warning,
                  },
                ]}
              >
                <Text
                  style={[styles.warningText, { color: colors.status.warning }]}
                >
                   {t('ageVerification.adultContentWarning')}
                </Text>
                <Text
                  style={[
                    styles.warningSubtext,
                    { color: colors.text.secondary },
                  ]}
                >
                   {t('ageVerification.adultContentDescription')}
                </Text>
              </View>

              <Text style={[styles.question, { color: colors.text.primary }]}>
                 {t('ageVerification.ageQuestion')}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Button
                title={t('ageVerification.yes18Plus')}
                onPress={handleConfirm}
                accessibilityRole="button"
              />

              <Button
                title={t('ageVerification.noUnder18')}
                onPress={handleDeny}
                style={{
                  borderColor: colors.interactive.disabled,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                }}
                accessibilityRole="button"
              />
            </View>

            {/* Footer */}
            <View
              style={[
                styles.footer,
                { borderTopColor: colors.border.secondary },
              ]}
            >
              <Text
                style={[styles.footerText, { color: colors.text.tertiary }]}
              >
                 {t('ageVerification.termsAgreement')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing.spacer24,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: spacing.spacer40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.spacer20,
    borderWidth: 2,
  },
  logoImage: {
    borderRadius: Platform.OS === 'web' ? 8 : 30,
  },
  platformName: {
    ...typography.heading1,
    textAlign: 'center',
    marginBottom: spacing.spacer8,
  },
  platformSubtitle: {
    ...typography.bodyText,
    textAlign: 'center',
  },
  verificationSection: {
    alignItems: 'center',
    paddingVertical: spacing.spacer20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.spacer24,
    borderWidth: 1,
  },
  title: {
    ...typography.heading1,
    textAlign: 'center',
    marginBottom: spacing.spacer12,
  },
  subtitle: {
    ...typography.bodyText,
    textAlign: 'center',
    marginBottom: spacing.spacer24,
    lineHeight: spacing.spacer24,
    paddingHorizontal: spacing.spacer20,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.spacer16,
    marginBottom: spacing.spacer24,
    width: '100%',
    maxWidth: 400,
  },
  warningText: {
    ...typography.bodyText,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.spacer8,
  },
  warningSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: spacing.spacer20,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: spacing.spacer16,
    paddingBottom: spacing.spacer20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.spacer20,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.spacer20,
  },
});
