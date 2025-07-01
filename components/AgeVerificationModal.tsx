import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  I18nManager,
} from 'react-native';
import { Shield, Calendar } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

// Enable RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const AGE_VERIFICATION_KEY = 'age_verified';

export default function AgeVerificationModal() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

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
      console.error('Error checking age verification:', error);
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
      console.error('Error saving age verification:', error);
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={[styles.logoContainer, { 
                backgroundColor: colors.interactive.secondary,
                borderColor: colors.gold 
              }]}>
                <Shield size={60} color={colors.gold} />
              </View>
              <Text style={[styles.platformName, { color: colors.gold }]}>הקונגרס הציוני</Text>
              <Text style={[styles.platformSubtitle, { color: colors.text.secondary }]}>פלטפורמה דיגיטלית מתקדמת</Text>
            </View>

            {/* Age Verification Section */}
            <View style={styles.verificationSection}>
              <View style={[styles.iconContainer, { 
                backgroundColor: colors.interactive.secondary,
                borderColor: colors.gold 
              }]}>
                <Calendar size={48} color={colors.gold} />
              </View>
              
              <Text style={[styles.title, { color: colors.text.primary }]}>אישור גיל</Text>
              <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                כדי להמשיך, עליך לאשר שאתה בן 18 ומעלה
              </Text>
              
              <View style={[styles.warningBox, { 
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                borderColor: colors.status.warning 
              }]}>
                <Text style={[styles.warningText, { color: colors.status.warning }]}>
                  ⚠️ תוכן זה מיועד לבוגרים בלבד
                </Text>
                <Text style={[styles.warningSubtext, { color: colors.text.secondary }]}>
                  הפלטפורמה מכילה תוכן המיועד לבני 18 ומעלה בהתאם לחוקי המדינה
                </Text>
              </View>

              <Text style={[styles.question, { color: colors.text.primary }]}>
                האם אתה בן 18 ומעלה?
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.gold }]}
                onPress={handleConfirm}
              >
                <Text style={[styles.confirmButtonText, { color: colors.text.inverse }]}>כן, אני בן 18 ומעלה</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.denyButton, { borderColor: colors.interactive.disabled }]}
                onPress={handleDeny}
              >
                <Text style={[styles.denyButtonText, { color: colors.text.primary }]}>לא, אני מתחת לגיל 18</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: colors.border.secondary }]}>
              <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
                על ידי המשך השימוש, אתה מאשר שקראת והסכמת לתנאי השימוש
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
    padding: 24,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  platformName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  platformSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  verificationSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  confirmButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  denyButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});