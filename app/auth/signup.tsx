import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, UserPlus } from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import InfoModal from '../../components/InfoModal';



export default function AuthSignupScreen() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error' as 'success' | 'error' | 'info' | 'warning'
  });
  const { colors } = useTheme();
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (!username || !password || !confirmPassword) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא מלא את כל השדות',
        type: 'error'
      });
      return;
    }

    if (password !== confirmPassword) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'הסיסמאות אינן תואמות',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const success = await signup(username, password, displayName || username);

      if (success) {
        setInfoModal({
          visible: true,
          title: 'הצלחה',
          message: 'החשבון נוצר בהצלחה! כעת תוכל להתחבר.',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: error instanceof Error ? error.message : 'ההרשמה נכשלה. אנא נסה שוב.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulSignup = () => {
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>הרשמה</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.interactive.secondary }]}>
            <UserPlus size={60} color={colors.gold} />
          </View>
          
          <Text style={[styles.title, { color: colors.text.primary }]}>יצירת חשבון</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            הצטרף אלינו והתחל לקנות
          </Text>

          <View style={styles.form}>


            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>שם משתמש</Text>
              <TextInput
                style={[styles.input, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary
                }]}
                value={username}
                onChangeText={setUsername}
                placeholder="בחר שם משתמש"
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>שם מלא</Text>
              <TextInput
                style={[styles.input, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary
                }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="הכנס את שמך המלא"
                autoCorrect={false}
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>סיסמה</Text>
              <TextInput
                style={[styles.input, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary
                }]}
                value={password}
                onChangeText={setPassword}
                placeholder="צור סיסמה"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text.primary }]}>אישור סיסמה</Text>
              <TextInput
                style={[styles.input, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.primary,
                  color: colors.text.primary
                }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="אשר את הסיסמה"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.signupButton, 
                { backgroundColor: colors.gold },
                loading && { backgroundColor: colors.interactive.disabled }
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={[styles.signupButtonText, { color: colors.text.inverse }]}>
                  צור חשבון
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.text.secondary }]}>
              כבר יש לך חשבון?{' '}
              <Text 
                style={[styles.linkText, { color: colors.gold }]} 
                onPress={() => router.push('/auth/login')}
              >
                התחבר
              </Text>
            </Text>
          </View>
        </ScrollView>

        {/* Info Modal */}
        <InfoModal
          visible={infoModal.visible}
          title={infoModal.title}
          message={infoModal.message}
          type={infoModal.type}
          onClose={() => {
            setInfoModal({...infoModal, visible: false});
            if (infoModal.type === 'success') {
              handleSuccessfulSignup();
            }
          }}
          autoClose={infoModal.type === 'success'}
          autoCloseTime={2000}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  signupButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  linkText: {
    fontWeight: '600',
  },
});
