import { errorLog } from '@/utils/logger';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAppRouter } from '@/services';
import { ArrowLeft, Save, Settings as SettingsIcon } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { publish as publishWaku } from '@/services/waku';
import { useTheme } from '@/ui/ThemeProvider';
import { useCurrency } from '../../../../contexts/CurrencyContext';
import { useLanguage } from '@/ui/ThemeProvider';
import { Spinner } from '@/ui/primitives';
import InfoModal from '../../../../components/InfoModal';
import { useAppInfo } from '../../../../contexts/AppInfoContext';
import commonStyles from '@/constants/styles';
import SettingsAgent from '../../../../agents/settings-agent';
import adminAgent, { type AdminRecord } from '../../../../agents/admin-agent';
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
import { makeSignedWakuMessage } from '@/utils/wakuSigning';
import uuid from '@/utils/uuid';

type PendingRequest = Pick<AdminRecord, 'address' | 'requestedAt'>;
const USERS_TOPIC = '/blue-ocean/users/1';

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
  const { isAdmin, isDriver, checkAuthState } = useAuth();
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
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const moonPayEnabled = useMemo(() => isMoonPayEnabled(), []);
  const storeTopic = useMemo(() => `/blue-ocean/stores/${storeId ?? '1'}`, [storeId]);

  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  const refreshPendingRequests = useCallback(async () => {
    try {
      const requests = await adminAgent.getPendingRequests();
      setPendingRequests(
        requests.map(({ address, requestedAt }) => ({ address, requestedAt })),
      );
    } catch (error) {
      errorLog('Failed to load pending admin requests:', error);
    }
  }, []);

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
    void refreshPendingRequests();
  }, [refreshPendingRequests]);

  useEffect(() => {
    const handleRequested = ({
      address,
      requestedAt,
    }: {
      address: string;
      requestedAt: number;
    }) => {
      const lower = address.toLowerCase();
      setPendingRequests((prev) => {
        if (prev.some((req) => req.address.toLowerCase() === lower)) {
          return prev.map((req) =>
            req.address.toLowerCase() === lower ? { address, requestedAt } : req,
          );
        }
        return [...prev, { address, requestedAt }];
      });
    };
    const handleRegistered = ({ address }: { address: string }) => {
      const lower = address.toLowerCase();
      setPendingRequests((prev) =>
        prev.filter((req) => req.address.toLowerCase() !== lower),
      );
      setAdmins((prev) =>
        prev.some((admin) => admin.toLowerCase() === lower)
          ? prev
          : [...prev, address],
      );
    };
    const handleRejected = ({ address }: { address: string }) => {
      const lower = address.toLowerCase();
      setPendingRequests((prev) =>
        prev.filter((req) => req.address.toLowerCase() !== lower),
      );
    };
    adminAgent.on('admin.requested', handleRequested);
    adminAgent.on('admin.registered', handleRegistered);
    adminAgent.on('admin.rejected', handleRejected);
    return () => {
      adminAgent.off('admin.requested', handleRequested);
      adminAgent.off('admin.registered', handleRegistered);
      adminAgent.off('admin.rejected', handleRejected);
    };
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
      const message = await makeSignedWakuMessage(
        'admin.joinRequested',
        {
          address,
          nonce: uuid(),
          ts: Date.now(),
        },
        'admin',
      );
      await publishWaku(USERS_TOPIC, message);
      await refreshPendingRequests();
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
      const normalized = address.toLowerCase();
      const waitForRegistration = () =>
        new Promise<void>((resolve, reject) => {
          let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
          const cleanup = () => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            adminAgent.off('admin.registered', handleRegistered);
            adminAgent.off('admin.rejected', handleRejected);
          };
          const handleRegistered = ({ address: approved }: { address: string }) => {
            if (approved.toLowerCase() !== normalized) return;
            cleanup();
            resolve();
          };
          const handleRejected = ({ address: rejected }: { address: string }) => {
            if (rejected.toLowerCase() !== normalized) return;
            cleanup();
            reject(new Error('rejected'));
          };
          adminAgent.on('admin.registered', handleRegistered);
          adminAgent.on('admin.rejected', handleRejected);
          timeoutHandle = setTimeout(() => {
            cleanup();
            reject(new Error('timeout'));
          }, 5000);
        });

      const resultPromise = waitForRegistration();
      const message = await makeSignedWakuMessage(
        'admin.approve',
        {
          address,
          nonce: uuid(),
          ts: Date.now(),
        },
        'admin',
      );
      await publishWaku(USERS_TOPIC, message);
      await resultPromise;
      const nextAdmins = Array.from(new Set([...admins, address]));
      await SettingsAgent.getInstance().setAdmins(nextAdmins);
      setAdmins(nextAdmins);
      setPendingRequests((prev) =>
        prev.filter((item) => item.address.toLowerCase() !== normalized),
      );
      await refreshPendingRequests();
      await checkAuthState();
      await eventBus.publish(storeTopic, 'admin.registered', {
        address,
      });
      setInfoModal({
        visible: true,
        title: 'אישור מנהל',
        message: 'המנהל החדש אושר בהצלחה.',
        type: 'success',
      });
    } catch (error) {
      errorLog('Failed to approve admin invite', error);
      const message =
        error instanceof Error && error.message === 'timeout'
          ? 'האישור לא התקבל בזמן. נסה שוב.'
          : 'אישור ההזמנה נכשל';
      Alert.alert('שגיאה', message);
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
          {pendingRequests.length === 0 ? (
            <Text style={{ color: colors.text.secondary }}>אין הזמנות ממתינות.</Text>
          ) : (
            pendingRequests.map(({ address, requestedAt }) => (
              <View
                key={address}
                style={[styles.inviteItem, { borderColor: colors.border.primary }]}
              >
                <View style={styles.inviteInfo}>
                  <Text
                    style={{ color: colors.text.primary, textAlign: 'right' }}
                  >
                    {address}
                  </Text>
                  {requestedAt ? (
                    <Text
                      style={[
                        styles.pendingMeta,
                        { color: colors.text.secondary, textAlign: 'right' },
                      ]}
                    >
                      {new Date(requestedAt).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
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
  inviteInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  approveInviteButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pendingMeta: {
    fontSize: 12,
  },
});
