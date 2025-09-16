import { errorLog } from '@/utils/logger';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import adminAgent, { type AdminAgentEvent } from '@/agents/admin-agent';
import BrandingSettings from '../../../../components/settings/BrandingSettings';
import CurrencySettings from '../../../../components/settings/CurrencySettings';
import EnvironmentSettings from '../../../../components/settings/EnvironmentSettings';
import LanguageSettings from '../../../../components/settings/LanguageSettings';
import NotificationSettings from '../../../../components/settings/NotificationSettings';
import RpcSettings from '../../../../components/settings/RpcSettings';
import MoonPaySettings from '../../../../components/settings/MoonPaySettings';
import PaymentFactorySettings from '../../../../components/settings/PaymentFactorySettings';
import { isMoonPayEnabled } from '@/config/featureFlags';
import eventBus from '@/services/eventBus';
import { useLaunchGate } from '@/features/launchGate/LaunchGateContext';
import { useWallet } from '@/contexts/WalletProvider';
import {
  listPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  requestAdminAccess,
  type PendingAdminRequest,
} from '@/services/adminRequests';
import {
  loadAdminInvites,
  addAdminInvite,
  removeAdminInvite,
} from '@/services/adminInvitesStore';

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
  const [pendingRequests, setPendingRequests] = useState<PendingAdminRequest[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [requestProcessing, setRequestProcessing] = useState<string | null>(null);
  const moonPayEnabled = useMemo(() => isMoonPayEnabled(), []);
  const storeTopic = useMemo(() => `/blue-ocean/stores/${storeId ?? '1'}`, [storeId]);

  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  const { requireUnlock } = useLaunchGate();
  const { address: walletAddress } = useWallet();
  const normalizeAddress = useCallback((value: string) => value.trim().toLowerCase(), []);

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

  useEffect(() => {
    loadAdminInvites()
      .then(setPendingInvites)
      .catch((err) => errorLog('Failed to load admin invites:', err));
  }, []);

  useEffect(() => {
    let active = true;
    listPendingAdminRequests()
      .then((requests) => {
        if (active) setPendingRequests(requests);
      })
      .catch((err) => errorLog('Failed to load admin requests:', err));

    const onRequested = (evt: AdminAgentEvent) => {
      if (evt.type !== 'admin.requested') return;
      setPendingRequests((prev) => {
        if (prev.some((item) => normalizeAddress(item.address) === normalizeAddress(evt.payload.address))) {
          return prev;
        }
        return [
          ...prev,
          {
            address: evt.payload.address,
            publicKey: '',
            requestedAt: evt.payload.requestedAt,
          },
        ];
      });
      setPendingInvites((prev) =>
        prev.filter((item) => normalizeAddress(item) !== normalizeAddress(evt.payload.address)),
      );
      void removeAdminInvite(evt.payload.address).catch((err) =>
        errorLog('Failed to sync admin invite removal', err),
      );
    };

    const onRegistered = (evt: AdminAgentEvent) => {
      if (evt.type !== 'admin.registered') return;
      setPendingRequests((prev) =>
        prev.filter((item) => normalizeAddress(item.address) !== normalizeAddress(evt.payload.address)),
      );
      setPendingInvites((prev) =>
        prev.filter((item) => normalizeAddress(item) !== normalizeAddress(evt.payload.address)),
      );
      void removeAdminInvite(evt.payload.address).catch((err) =>
        errorLog('Failed to sync admin invite removal', err),
      );
    };

    const onRejected = (evt: AdminAgentEvent) => {
      if (evt.type !== 'admin.rejected') return;
      setPendingRequests((prev) =>
        prev.filter((item) => normalizeAddress(item.address) !== normalizeAddress(evt.payload.address)),
      );
      void removeAdminInvite(evt.payload.address).catch((err) =>
        errorLog('Failed to sync admin invite removal', err),
      );
    };

    adminAgent.on('admin.requested', onRequested as any);
    adminAgent.on('admin.registered', onRegistered as any);
    adminAgent.on('admin.rejected', onRejected as any);

    return () => {
      active = false;
      adminAgent.off('admin.requested', onRequested as any);
      adminAgent.off('admin.registered', onRegistered as any);
      adminAgent.off('admin.rejected', onRejected as any);
    };
  }, [normalizeAddress]);

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
      const normalized = normalizeAddress(address);
      if (walletAddress && normalizeAddress(walletAddress) === normalized) {
        await requestAdminAccess(address);
        const refreshed = await listPendingAdminRequests();
        setPendingRequests(refreshed);
        setInfoModal({
          visible: true,
          title: 'בקשה נשלחה',
          message: 'הבקשה הועברה לאישור מנהל קיים.',
          type: 'success',
        });
      } else {
        const updatedInvites = await addAdminInvite(address);
        setPendingInvites(updatedInvites);
        setInfoModal({
          visible: true,
          title: 'הזמנה נשמרה',
          message: 'הזמנה נשמרה במערכת. עדכן את המועמד להגיש בקשה.',
          type: 'success',
        });
      }
      setInviteAddress('');
    } catch (error) {
      errorLog('Failed to process admin invitation', error);
      Alert.alert('שגיאה', 'שליחת ההזמנה נכשלה');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleApproveRequest = async (address: string) => {
    setRequestProcessing(address);
    try {
      await requireUnlock('admin.approval');
      await approveAdminRequest(address);
      const nextAdmins = Array.from(
        new Set([...admins, address].map((item) => item.trim())),
      );
      await SettingsAgent.getInstance().setAdmins(nextAdmins);
      setAdmins(nextAdmins);
      setPendingRequests((prev) =>
        prev.filter((item) => normalizeAddress(item.address) !== normalizeAddress(address)),
      );
      const updatedInvites = await removeAdminInvite(address);
      setPendingInvites(updatedInvites);
      setInfoModal({
        visible: true,
        title: 'הצלחה',
        message: 'המנהל החדש נוסף בהצלחה.',
        type: 'success',
      });
    } catch (error) {
      errorLog('Failed to approve admin request', error);
      Alert.alert('שגיאה', 'אישור הבקשה נכשל');
    } finally {
      setRequestProcessing(null);
    }
  };

  const handleRejectRequest = async (address: string) => {
    setRequestProcessing(address);
    try {
      await requireUnlock('admin.approval');
      await rejectAdminRequest(address);
      setPendingRequests((prev) =>
        prev.filter((item) => normalizeAddress(item.address) !== normalizeAddress(address)),
      );
      const updatedInvites = await removeAdminInvite(address);
      setPendingInvites(updatedInvites);
      setInfoModal({
        visible: true,
        title: 'עודכן',
        message: 'הבקשה נדחתה והוזזה מהרשימה.',
        type: 'success',
      });
    } catch (error) {
      errorLog('Failed to reject admin request', error);
      Alert.alert('שגיאה', 'דחיית הבקשה נכשלה');
    } finally {
      setRequestProcessing(null);
    }
  };

  const handleRemoveInvite = async (address: string) => {
    try {
      const updated = await removeAdminInvite(address);
      setPendingInvites(updated);
    } catch (error) {
      errorLog('Failed to remove admin invite', error);
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
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>בקשות לאישור</Text>
          {pendingRequests.length === 0 ? (
            <Text style={{ color: colors.text.secondary }}>אין בקשות פעילות.</Text>
          ) : (
            pendingRequests.map((request) => (
              <View
                key={`${request.address}:${request.requestedAt}`}
                style={[styles.inviteItem, { borderColor: colors.border.primary }]}
              >
                <View style={styles.requestInfo}>
                  <Text style={{ color: colors.text.primary }}>{request.address}</Text>
                  <Text style={{ color: colors.text.secondary }}>
                    {new Date(request.requestedAt).toLocaleString('he-IL')}
                  </Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.rejectInviteButton, { borderColor: colors.status.error }]}
                    onPress={() => handleRejectRequest(request.address)}
                    disabled={requestProcessing === request.address}
                  >
                    <Text style={{ color: colors.status.error }}>דחה</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveInviteButton, { borderColor: colors.status.success }]}
                    onPress={() => handleApproveRequest(request.address)}
                    disabled={requestProcessing === request.address}
                  >
                    <Text style={{ color: colors.status.success }}>אשר</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
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
                  style={[styles.rejectInviteButton, { borderColor: colors.border.primary }]}
                  onPress={() => handleRemoveInvite(address)}
                  disabled={inviteLoading}
                >
                  <Text style={{ color: colors.text.primary }}>הסר</Text>
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
    alignItems: 'center',
  },
  rejectInviteButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    marginRight: 8,
  },
  requestInfo: { flex: 1, gap: 4 },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
