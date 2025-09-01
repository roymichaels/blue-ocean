import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppRouter from 'hooks/useAppRouter';
import { ArrowLeft, Save, Settings as SettingsIcon } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useCurrency } from '../../../../contexts/CurrencyContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import Spinner from '../../../../components/ui/Spinner';
import InfoModal from '../../../../components/InfoModal';
import { useAppInfo } from '../../../../contexts/AppInfoContext';
import commonStyles from '@/constants/styles';
import SettingsAgent from '../../../../agents/settings-agent';
import BrandingSettings from '../../../../components/settings/BrandingSettings';
import CurrencySettings from '../../../../components/settings/CurrencySettings';
import EnvironmentSettings from '../../../../components/settings/EnvironmentSettings';
import LanguageSettings from '../../../../components/settings/LanguageSettings';
import NotificationSettings from '../../../../components/settings/NotificationSettings';
import RpcSettings from '../../../../components/settings/RpcSettings';
import MoonPaySettings from '../../../../components/settings/MoonPaySettings';
import PaymentFactorySettings from '../../../../components/settings/PaymentFactorySettings';

export default function SettingsScreen() {
  const { replace, back } = useAppRouter();
  const [currencySymbol, setCurrencySymbolState] = useState('₪');
  const [name, setName] = useState('');
  const [logoCidInput, setLogoCidInput] = useState('');
  const [themeColor, setThemeColorState] = useState('#B99C5A');
  const [fiatKeyInput, setFiatKeyInput] = useState('');
  const [paymentFactoryAddress, setPaymentFactoryAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAdmin, isDriver } = useAuth();
  const { colors } = useTheme();
  const { currencySymbol: contextCurrencySymbol, setCurrencySymbol } = useCurrency();
  const { currentLanguage, t } = useLanguage();
  const {
    appName,
    logoCid,
    themeColor: contextThemeColor,
    fiatKey,
    setAppName,
    setLogoCid,
    setThemeColor,
    setFiatKey,
  } = useAppInfo();
  const [admins, setAdmins] = useState<string[]>([]);

  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  useEffect(() => {
    if (!isAdmin && !isDriver) {
      replace('/');
      return;
    }
    loadSettings();
  }, [isAdmin, isDriver]);

  useEffect(() => {
    SettingsAgent.getInstance()
      .getAdmins()
      .then(setAdmins)
      .catch((err) => errorLog('Failed to load admins:', err));
  }, []);

  useEffect(() => {
    setCurrencySymbolState(contextCurrencySymbol);
    setName(appName);
    setThemeColorState(contextThemeColor);
    setLogoCidInput(logoCid || '');
    setFiatKeyInput(fiatKey || '');
  }, [contextCurrencySymbol, appName, logoCid, contextThemeColor, fiatKey]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      setCurrencySymbolState(contextCurrencySymbol);
      setName(appName);
      setThemeColorState(contextThemeColor);
      setLogoCidInput(logoCid || '');
      setFiatKeyInput(fiatKey || '');
      const pf = await SettingsAgent.getInstance().getSettingValue('paymentFactoryAddress');
      setPaymentFactoryAddress(pf || '');
    } catch (error) {
      errorLog('Error loading settings:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת ההגדרות נכשלה',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setCurrencySymbol(currencySymbol);
      await setAppName(name);
      await setThemeColor(themeColor);
      const logoUri = logoCidInput.trim();
      await setLogoCid(logoUri);
      await setFiatKey(fiatKeyInput.trim());
      await SettingsAgent.getInstance().updateSettingValue(
        'paymentFactoryAddress',
        paymentFactoryAddress.trim(),
      );
      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'ההגדרות נשמרו בהצלחה',
        type: 'success',
      });
    } catch (error) {
      errorLog('Error saving settings:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'שמירת ההגדרות נכשלה',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}> 
          <TouchableOpacity onPress={() => back()}>
            <ArrowLeft size={24} color={colors.text.primary} /> 
          </TouchableOpacity> 
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>הגדרות מערכת</Text> 
          <View style={commonStyles.spacer24} /> 
        </View> 
        <Spinner label="Loading settings" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}> 
        <TouchableOpacity onPress={() => back()}>
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

        <BrandingSettings
          name={name}
          setName={setName}
          logoCidInput={logoCidInput}
          setLogoCidInput={setLogoCidInput}
          themeColor={themeColor}
          setThemeColorState={setThemeColorState}
          colors={colors}
          t={t}
        />
        <CurrencySettings
          currencySymbol={currencySymbol}
          setCurrencySymbolState={setCurrencySymbolState}
          colors={colors}
        />
        <MoonPaySettings
          fiatKeyInput={fiatKeyInput}
          setFiatKeyInput={setFiatKeyInput}
          colors={colors}
        />
        <PaymentFactorySettings
          paymentFactoryAddress={paymentFactoryAddress}
          setPaymentFactoryAddress={setPaymentFactoryAddress}
          colors={colors}
        />
        <EnvironmentSettings colors={colors} admins={admins} />
        <RpcSettings colors={colors} />
        <LanguageSettings colors={colors} currentLanguage={currentLanguage} />
        <NotificationSettings colors={colors} />

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.gold }]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <Spinner size="small" color={colors.text.inverse} />
          ) : (
            <>
              <Save size={20} color={colors.text.inverse} />
              <Text style={[styles.saveButtonText, { color: colors.text.inverse }]}>שמור הגדרות</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
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
