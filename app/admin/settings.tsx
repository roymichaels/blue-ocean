import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Save, Settings as SettingsIcon, DollarSign, Globe, Bell, Image as ImageIcon } from 'lucide-react-native';
import { useConfig } from '../../contexts/ConfigContext';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import InfoModal from '../../components/InfoModal';
import MediaUploader from '../../components/MediaUploader';
import { useAppInfo } from '../../contexts/AppInfoContext';
import commonStyles from '../../constants/styles';



export default function SettingsScreen() {
  const [currencySymbol, setCurrencySymbolState] = useState('₪');

  const [name, setName] = useState('');
  const [logoMedia, setLogoMedia] = useState<any[]>([]);
  const [themeColor, setThemeColorState] = useState('#B99C5A');
  const [tenant, setTenant] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [pinataJwt, setPinataJwt] = useState('');
  const [pinataApiKey, setPinataApiKey] = useState('');
  const [pinataSecret, setPinataSecret] = useState('');
  const [moonpayKey, setMoonpayKey] = useState('');
  const [chatSecret, setChatSecret] = useState('');
  const [wakuSecret, setWakuSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAdmin, isDriver } = useAuth();
  const { colors } = useTheme();
  const { currencySymbol: contextCurrencySymbol, setCurrencySymbol } = useCurrency();
  const { t, currentLanguage } = useLanguage();
  const { platformName, platformLogo, themeColor: contextThemeColor, setPlatformName, setPlatformLogo, setThemeColor } = useAppInfo();
  const { config, setValue } = useConfig();

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    if (!isAdmin && !isDriver) {
      router.replace('/');
      return;
    }
    
    loadSettings();
  }, [isAdmin, isDriver]);

  useEffect(() => {
    // Update local state when context changes
    setCurrencySymbolState(contextCurrencySymbol);

    setName(platformName);
    setThemeColorState(contextThemeColor);
    if (platformLogo) {
      setLogoMedia([{ id: 'logo', uri: platformLogo, type: 'image' }]);
    } else {
      setLogoMedia([]);
    }
  }, [contextCurrencySymbol, platformName, platformLogo, contextThemeColor]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Currency symbol is already loaded from context
      setCurrencySymbolState(contextCurrencySymbol);

      setName(platformName);
      setThemeColorState(contextThemeColor);
      if (platformLogo) {
        setLogoMedia([{ id: 'logo', uri: platformLogo, type: 'image' }]);
      }
      setTenant(config.EXPO_PUBLIC_TENANT || '');
      setAdminUsername(config.EXPO_PUBLIC_ADMIN_USERNAME || '');
      setPinataJwt(config.EXPO_PUBLIC_PINATA_JWT || '');
      setPinataApiKey(config.EXPO_PUBLIC_PINATA_API_KEY || '');
      setPinataSecret(config.EXPO_PUBLIC_PINATA_SECRET_API_KEY || '');
      setMoonpayKey(config.MOONPAY_KEY || '');
      setChatSecret(config.EXPO_PUBLIC_CHAT_SECRET || '');
      setWakuSecret(config.EXPO_PUBLIC_WAKU_SECRET || '');
    } catch (error) {
      console.error('Error loading settings:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת ההגדרות נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Update currency symbol in context (which will update database)
      await setCurrencySymbol(currencySymbol);

      await setPlatformName(name);
      await setThemeColor(themeColor);
      const logoUri = logoMedia[0]?.uri || '';
      await setPlatformLogo(logoUri);

      setValue('EXPO_PUBLIC_TENANT', tenant);
      setValue('EXPO_PUBLIC_ADMIN_USERNAME', adminUsername);
      setValue('EXPO_PUBLIC_PINATA_JWT', pinataJwt);
      setValue('EXPO_PUBLIC_PINATA_API_KEY', pinataApiKey);
      setValue('EXPO_PUBLIC_PINATA_SECRET_API_KEY', pinataSecret);
      setValue('MOONPAY_KEY', moonpayKey);
      setValue('EXPO_PUBLIC_CHAT_SECRET', chatSecret);
      setValue('EXPO_PUBLIC_WAKU_SECRET', wakuSecret);
      setValue('APP_NAME', name);
      setValue('PRIMARY_COLOR', themeColor);
      setValue('APP_LOGO', logoUri);

      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'ההגדרות נשמרו בהצלחה',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'שמירת ההגדרות נכשלה',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>הגדרות מערכת</Text>
          <View style={commonStyles.spacer24} />
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>הגדרות מערכת</Text>
        <View style={commonStyles.spacer24} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <SettingsIcon size={24} color={colors.gold} />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>הגדרות כלליות</Text>
        </View>

        {/* Branding Settings */}
        <View style={[styles.settingCard, {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
          ...Platform.select({
            ios: { elevation: 2 },
            android: { elevation: 2 },
            web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
          }),
        }]}>
          <View style={styles.settingHeader}>
            <SettingsIcon size={20} color={colors.gold} />
            <Text style={[styles.settingTitle, { color: colors.text.primary }]}>הגדרות מיתוג</Text>
          </View>

          <View style={styles.settingContent}>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>שם הפלטפורמה</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.secondary,
                  color: colors.text.primary
                }]}

                value={name}
                onChangeText={setName}
                placeholder={t('ageVerification.platformName')}
                textAlign="right"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>לוגו</Text>
              <MediaUploader
                media={logoMedia}
                onMediaChange={setLogoMedia}
                maxFiles={1}
                allowVideos={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>צבע נושא</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColorState(e.target.value)}
                  style={styles.colorInput}
                />
              ) : (
                <View style={styles.colorOptions}>
                  {['#B99C5A', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setThemeColorState(c)}
                      style={[
                        styles.colorOption,
                        {
                          backgroundColor: c,
                          borderWidth: themeColor === c ? 3 : 1,
                          borderColor: themeColor === c
                            ? colors.gold
                            : colors.border.primary,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Currency Settings */}
        <View style={[styles.settingCard, {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
          ...Platform.select({
            ios: { elevation: 2 },
            android: { elevation: 2 },
            web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
          }),
        }]}>
          <View style={styles.settingHeader}>
            <DollarSign size={20} color={colors.gold} />
            <Text style={[styles.settingTitle, { color: colors.text.primary }]}>הגדרות מטבע</Text>
          </View>
          
          <View style={styles.settingContent}>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              הגדר את סמל המטבע שיוצג בכל רחבי האפליקציה
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>סמל מטבע</Text>
              <TextInput
                style={[styles.input, { 
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.secondary,
                  color: colors.text.primary 
                }]}
                value={currencySymbol}
                onChangeText={setCurrencySymbolState}
                placeholder="₪"
                maxLength={3}
                textAlign="center"
              />
            </View>
            
            <Text style={[styles.helperText, { color: colors.text.tertiary }]}>
              דוגמאות: ₪, $, €, £
            </Text>
          </View>
        </View>

        {/* Advanced Settings */}
        <View style={[styles.settingCard, {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
          ...Platform.select({
            ios: { elevation: 2 },
            android: { elevation: 2 },
            web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
          }),
        }]}>
          <View style={styles.settingHeader}>
            <ImageIcon size={20} color={colors.gold} />
            <Text style={[styles.settingTitle, { color: colors.text.primary }]}>API Keys & Secrets</Text>
          </View>

          <View style={styles.settingContent}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Tenant ID</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.secondary,
                  color: colors.text.primary
                }]}
                value={tenant}
                onChangeText={setTenant}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Admin Username</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.secondary,
                  color: colors.text.primary
                }]}
                value={adminUsername}
                onChangeText={setAdminUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Pinata JWT</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.secondary,
                  color: colors.text.primary
                }]}
                value={pinataJwt}
                onChangeText={setPinataJwt}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Pinata API Key</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.secondary,
                  color: colors.text.primary
                }]}
                value={pinataApiKey}
                onChangeText={setPinataApiKey}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Pinata Secret</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.secondary,
                  color: colors.text.primary
                }]}
                value={pinataSecret}
                onChangeText={setPinataSecret}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>MoonPay Key</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.secondary,
                  color: colors.text.primary
                }]}
                value={moonpayKey}
                onChangeText={setMoonpayKey}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Chat Secret</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.secondary,
                  color: colors.text.primary
                }]}
                value={chatSecret}
                onChangeText={setChatSecret}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text.primary }]}>Waku Secret</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.border.primary,
                  backgroundColor: colors.surface.secondary,
                  color: colors.text.primary
                }]}
                value={wakuSecret}
                onChangeText={setWakuSecret}
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Language Settings - Info Only */}
        <View style={[styles.settingCard, { 
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
          ...Platform.select({
            ios: { elevation: 2 },
            android: { elevation: 2 },
            web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
          }),
        }]}>
          <View style={styles.settingHeader}>
            <Globe size={20} color={colors.gold} />
            <Text style={[styles.settingTitle, { color: colors.text.primary }]}>הגדרות שפה</Text>
          </View>
          
          <View style={styles.settingContent}>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              ניתן לשנות את שפת האפליקציה מתפריט הפרופיל
            </Text>
            
            <View style={[styles.infoBox, { backgroundColor: colors.interactive.secondary }]}>
              <Text style={[styles.infoText, { color: colors.text.primary }]}>
                שפה נוכחית: {currentLanguage === 'he' ? 'עברית' : 'English'}
              </Text>
            </View>
          </View>
        </View>

        {/* Notification Settings - Coming Soon */}
        <View style={[styles.settingCard, { 
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
          opacity: 0.7,
          ...Platform.select({
            ios: { elevation: 2 },
            android: { elevation: 2 },
            web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
          }),
        }]}>
          <View style={styles.settingHeader}>
            <Bell size={20} color={colors.gold} />
            <Text style={[styles.settingTitle, { color: colors.text.primary }]}>הגדרות התראות</Text>
          </View>
          
          <View style={styles.settingContent}>
            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
              הגדרות התראות מערכת ודחיפה
            </Text>
            
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.comingSoonText, { color: colors.text.inverse }]}>בקרוב</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: colors.gold }]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <LoadingSpinner size="small" color={colors.text.inverse} />
          ) : (
            <>
              <Save size={20} color={colors.text.inverse} />
              <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>שמור הגדרות</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({...infoModal, visible: false})}
      />
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
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'flex-end',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  settingCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-end',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  settingContent: {
    padding: 16,
  },
  settingDescription: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'right',
  },
  colorInput: {
    width: 40,
    height: 40,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    textAlign: 'right',
  },
  infoBox: {
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  comingSoonBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
