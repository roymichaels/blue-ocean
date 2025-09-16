import { errorLog } from '@/utils/logger';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAppRouter } from '@/services';
import { ArrowLeft, Save, Settings as SettingsIcon } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/ui/ThemeProvider';
import { useCurrency } from '../../../../contexts/CurrencyContext';
import { useLanguage } from '@/ui/ThemeProvider';
import { Spinner } from '@/ui/primitives';
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
import eventBus from '@/services/eventBus';
import { isMoonPayEnabled } from '@/config/featureFlags';

export default function SettingsScreen() {
  const { replace, back } = useAppRouter();
  const params = useLocalSearchParams<{ storeId: string }>();
  const storeId = Array.isArray(params.storeId) ? params.storeId[0] : params.storeId;
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
  const [inviteAddress, setInviteAddress] = useState('');
  const [pendingInvites, setPendingInvites] = useState<string[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const moonPayEnabled = useMemo(() => isMoonPayEnabled(), []);
  const storeTopic = useMemo(() => `/blue-ocean/stores/${storeId ?? '1'}`, [storeId]);

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
      await eventBus.publish(storeTopic, 'store.updated', {
        profile: {
          name,
          logoCid: logoUri,
          themeColor,
          currencySymbol,
        },
      });
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

  const sendInvite = async () => {
    const address = inviteAddress.trim();
    if (!address) {
      Alert.alert('שגיאה', 'נא להזין כתובת ארנק להזמנה');
      return;
    }
    setInviteLoading(true);
    try {
      await eventBus.publish(storeTopic, 'admin.joinRequested', {
        address,
      });
      setPendingInvites((prev) =>
        prev.includes(address) ? prev : [...prev, address],
      );
      setInviteAddress('');
      setInfoModal({
        visible: true,
        title: 'הזמנה נשלחה',
        message: 'המנהל החדש יקבל בקשת הצטרפות.',
        type: 'success',
      });
    } catch (error) {
      errorLog('Failed to publish admin invitation', error);
      Alert.alert('שגיאה', 'שליחת ההזמנה נכשלה');
    } finally {
      setInviteLoading(false);
    }
  };

  const approveInvite = async (address: string) => {
    setInviteLoading(true);
    try {
      await eventBus.publish(storeTopic, 'admin.registered', {
        address,
      });
      const nextAdmins = Array.from(new Set([...admins, address]));
      await SettingsAgent.getInstance().setAdmins(nextAdmins);
      setAdmins(nextAdmins);
      setPendingInvites((prev) => prev.filter((item) => item !== address));
    } catch (error) {
      errorLog('Failed to approve admin invite', error);
      Alert.alert('שגיאה', 'אישור ההזמנה נכשל');
    } finally {
      setInviteLoading(false);
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
        <Spinner />
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
          disabled={!moonPayEnabled}
        />
        <PaymentFactorySettings
          paymentFactoryAddress={paymentFactoryAddress}
          setPaymentFactoryAddress={setPaymentFactoryAddress}
          colors={colors}
        />
        <View style={styles.sectionHeader}>
          <SettingsIcon size={24} color={colors.gold} />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>ניהול מנהלים</Text>
        </View>
        <View
          style={[styles.adminCard, { borderColor: colors.border.primary, backgroundColor: colors.surface.primary }]}
        >
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>הזמנת מנהל חדש</Text>
          <View style={styles.inviteRow}>
            <TextInput
              style={[styles.inviteInput, { borderColor: colors.border.primary, color: colors.text.primary }]}
              value={inviteAddress}
              onChangeText={setInviteAddress}
              placeholder="wallet.near"
              placeholderTextColor={colors.text.tertiary}
              textAlign="right"
            />
            <TouchableOpacity
              style={[styles.inviteButton, { borderColor: colors.border.primary }]}
              onPress={sendInvite}
              disabled={inviteLoading}
              accessibilityRole="button"
            >
              <Text style={{ color: colors.text.primary }}>שליחת הזמנה</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: colors.text.secondary }}>
            הזמנה חדשה דורשת אישור מנהל קיים לפני כניסה למערכת.
          </Text>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>הזמנות בהמתנה</Text>
          {pendingInvites.length === 0 ? (
            <Text style={{ color: colors.text.secondary }}>אין הזמנות ממתינות.</Text>
          ) : (
            pendingInvites.map((address) => (
              <View
                key={address}
                style={[styles.inviteItem, { borderColor: colors.border.primary }]}
              >
                <Text style={{ color: colors.text.primary }}>{address}</Text>
                <TouchableOpacity
                  style={[styles.approveInviteButton, { borderColor: colors.status.success }]}
                  onPress={() => approveInvite(address)}
                  disabled={inviteLoading}
                >
                  <Text style={{ color: colors.status.success }}>אשר</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>מנהלים פעילים</Text>
          {admins.length === 0 ? (
            <Text style={{ color: colors.text.secondary }}>עדיין לא הוגדרו מנהלים נוספים.</Text>
          ) : (
            admins.map((admin) => (
              <Text key={admin} style={{ color: colors.text.secondary }}>
                {admin}
              </Text>
            ))
          )}
        </View>
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
  adminCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  inviteRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  inviteInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inviteButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inviteItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  approveInviteButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
