import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, LogIn, UserPlus, Lock, User } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from './AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { router } from 'expo-router';
import InfoModal from './InfoModal';

const { width } = Dimensions.get('window');

interface AuthTabsModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
}

export default function AuthTabsModal({
  visible,
  onClose,
  initialTab = 'login'
}: AuthTabsModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
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
  
  const { login, signup } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const resetForm = () => {
    setUsername('');
    setDisplayName('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleTabChange = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    resetForm();
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('auth.fillAllFields'),
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password);
      
      if (success) {
        onClose();
        router.replace('/');
      } else {
        setInfoModal({
          visible: true,
          title: t('common.error'),
          message: t('auth.loginError'),
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('auth.loginError'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!username || !password || !confirmPassword) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('auth.fillAllFields'),
        type: 'error'
      });
      return;
    }

    if (password !== confirmPassword) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('auth.passwordMismatch'),
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
          title: t('common.success'),
          message: t('auth.signupSuccess'),
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signupError'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulSignup = () => {
    handleTabChange('login');
  };

  const renderLoginTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.interactive.secondary }]}>
          <LogIn size={40} color={colors.gold} />
        </View>
      </View>
      
      <Text style={[styles.title, { color: colors.text.primary }]}>{t('auth.welcomeBack')}</Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}> 
        {t('auth.loginSubtitle')} 
      </Text>
      
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>{t('auth.username')}</Text>
          <TextInput
            style={[styles.input, {
              borderColor: colors.border.primary,
              backgroundColor: colors.surface.primary,
              color: colors.text.primary
            }]}
            value={username}
            onChangeText={setUsername}
            placeholder={t('auth.usernamePlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>{t('auth.password')}</Text>
          <TextInput
            style={[styles.input, { 
              borderColor: colors.border.primary,
              backgroundColor: colors.surface.primary,
              color: colors.text.primary
            }]}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.actionButton, 
            { backgroundColor: colors.gold },
            loading && { backgroundColor: colors.interactive.disabled }
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text style={[styles.actionButtonText, { color: colors.text.inverse }]}>
              {t('auth.login')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.switchContainer}>
        <Text style={[styles.switchText, { color: colors.text.secondary }]}> 
          {t('auth.noAccount')} {' '}
        </Text>
        <TouchableOpacity onPress={() => handleTabChange('signup')}>
          <Text style={[styles.switchLink, { color: colors.gold }]}>{t('auth.signup')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSignupTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.interactive.secondary }]}>
          <UserPlus size={40} color={colors.gold} />
        </View>
      </View>
      
      <Text style={[styles.title, { color: colors.text.primary }]}>{t('auth.createAccount')}</Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}> 
        {t('auth.signupSubtitle')} 
      </Text>
      
      <View style={styles.form}>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>{t('auth.username')}</Text>
          <TextInput
            style={[styles.input, { 
              borderColor: colors.border.primary,
              backgroundColor: colors.surface.primary,
              color: colors.text.primary
            }]}
            value={username}
            onChangeText={setUsername}
            placeholder={t('auth.usernamePlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>{t('auth.fullName')}</Text>
          <TextInput
            style={[styles.input, { 
              borderColor: colors.border.primary,
              backgroundColor: colors.surface.primary,
              color: colors.text.primary
            }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('auth.fullNamePlaceholder')}
            autoCorrect={false}
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>{t('auth.password')}</Text>
          <TextInput
            style={[styles.input, { 
              borderColor: colors.border.primary,
              backgroundColor: colors.surface.primary,
              color: colors.text.primary
            }]}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.createPasswordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text.primary }]}>{t('auth.confirmPassword')}</Text>
          <TextInput
            style={[styles.input, { 
              borderColor: colors.border.primary,
              backgroundColor: colors.surface.primary,
              color: colors.text.primary
            }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="right"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.actionButton, 
            { backgroundColor: colors.gold },
            loading && { backgroundColor: colors.interactive.disabled }
          ]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text style={[styles.actionButtonText, { color: colors.text.inverse }]}>
              {t('auth.createAccount')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.switchContainer}>
        <Text style={[styles.switchText, { color: colors.text.secondary }]}> 
          {t('auth.hasAccount')} {' '}
        </Text>
        <TouchableOpacity onPress={() => handleTabChange('login')}>
          <Text style={[styles.switchLink, { color: colors.gold }]}>{t('auth.login')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={[styles.modalView, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
            
            <View style={[styles.tabsContainer, { backgroundColor: colors.surface.primary }]}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'login' && [styles.activeTab, { backgroundColor: colors.gold }]
                ]}
                onPress={() => handleTabChange('login')}
              >
                <Text style={[
                  styles.tabText,
                  { color: colors.text.primary },
                  activeTab === 'login' && { color: colors.text.inverse }
                ]}>
                  {t('auth.login')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'signup' && [styles.activeTab, { backgroundColor: colors.gold }]
                ]}
                onPress={() => handleTabChange('signup')}
              >
                <Text style={[
                  styles.tabText,
                  { color: colors.text.primary },
                  activeTab === 'signup' && { color: colors.text.inverse }
                ]}>
                  {t('auth.signup')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'login' ? renderLoginTab() : renderSignupTab()}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      
      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => {
          setInfoModal({...infoModal, visible: false});
          if (infoModal.type === 'success' && activeTab === 'signup') {
            handleSuccessfulSignup();
          }
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)'
      }
    })
  },
  modalHeader: {
    padding: 16,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 25,
    marginTop: 40,
    marginBottom: 20,
    padding: 4,
    width: width * 0.7,
    maxWidth: 300,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 25,
  },
  activeTab: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)'
      }
    })
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  tabContent: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
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
    paddingVertical: 14,
    fontSize: 16,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
