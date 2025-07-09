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
import { ArrowLeft, Lock, Shield } from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import InfoModal from '../../components/InfoModal';



export default function AuthLoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error' as 'success' | 'error' | 'info' | 'warning'
  });
  const { login } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const handleLogin = async () => {
    if (!username || !password) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא הכנס שם משתמש וסיסמה',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password);
      
      if (success) {
        router.replace('/');
      } else {
        setInfoModal({
          visible: true,
          title: 'שגיאה',
          message: 'פרטי התחברות שגויים או אין לך הרשאות מנהל. רק מנהלים יכולים להתחבר.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'ההתחברות נכשלה. אנא נסה שוב.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
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
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>התחברות</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.interactive.secondary }]}>
            <Lock size={60} color={colors.gold} />
          </View>
          
          <Text style={[styles.title, { color: colors.text.primary }]}>ברוכים השבים</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            התחבר לחשבון שלך
          </Text>
          
          <View style={styles.adminNote}>
            <Shield size={16} color={colors.gold} />
            <Text style={[styles.adminNoteText, { color: colors.text.secondary }]}>
              רק מנהלים יכולים להתחבר למערכת
            </Text>
          </View>

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
              placeholder="הכנס שם משתמש"
              autoCapitalize="none"
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
                placeholder="הכנס סיסמה"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton, 
                { backgroundColor: colors.gold },
                loading && { backgroundColor: colors.interactive.disabled }
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={[styles.loginButtonText, { color: colors.text.inverse }]}>
                  התחבר
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.text.secondary }]}>
              אין לך חשבון?{' '}
              <Text 
                style={[styles.linkText, { color: colors.gold }]} 
                onPress={() => router.push('/auth/signup')}
              >
                הירשם
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
          onClose={() => setInfoModal({...infoModal, visible: false})}
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
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(185, 156, 90, 0.1)',
  },
  adminNoteText: {
    fontSize: 14,
    marginLeft: 8,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
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
  loginButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonText: {
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
