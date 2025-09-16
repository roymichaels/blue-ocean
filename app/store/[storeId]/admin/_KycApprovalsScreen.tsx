import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, ShieldCheck, X, XCircle } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services';
import SettingsAgent from '@/agents/settings-agent';
import usersAgent from '@/agents/users-agent';
import type { User } from '@/types';
import { Spinner } from '@/ui/primitives';
import { issueKycReceipt, loadKycReceipt } from '@/services/kycReceipts';
import { resolveKycPackage, type KycPackageResolution } from '@/services/kycPackages';
import { useLaunchGate } from '@/features/launchGate/LaunchGateContext';

const POLICY_SETTING_KEY = 'kyc.required';

export default function KycApprovalsScreen(): React.ReactElement {
  const { colors } = useTheme();
  const { back } = useAppRouter();
  const { requireUnlock } = useLaunchGate();
  const [policyRequired, setPolicyRequired] = useState(false);
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<KycPackageResolution | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [policyValue, users] = await Promise.all([
        SettingsAgent.getInstance().getSettingValue(POLICY_SETTING_KEY),
        usersAgent.getAll(),
      ]);
      setPolicyRequired((policyValue || '').toLowerCase() === 'on');
      setPending(users.filter((user) => user.kycStatus === 'pending'));
    } catch (error) {
      Alert.alert('שגיאה', 'טעינת בקשות KYC נכשלה');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const togglePolicy = useCallback(async () => {
    const next = !policyRequired;
    setPolicySaving(true);
    try {
      await SettingsAgent.getInstance().updateSettingValue(
        POLICY_SETTING_KEY,
        next ? 'on' : 'off',
      );
      setPolicyRequired(next);
    } catch (error) {
      Alert.alert('שגיאה', 'עדכון מדיניות KYC נכשל');
    } finally {
      setPolicySaving(false);
    }
  }, [policyRequired]);

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
    setPreviewLoading(false);
    setPreviewData(null);
    setPreviewError(null);
  }, []);

  const handlePreview = useCallback(
    async (user: User) => {
      if (user.kycRequestNotes && !user.kycDocumentUri) {
        Alert.alert('הערות משתמש', user.kycRequestNotes);
        return;
      }
      if (!user.kycDocumentUri) {
        Alert.alert('מידע חסר', 'לא נמצאו מסמכי אימות עבור משתמש זה.');
        return;
      }
      setPreviewVisible(true);
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewData(null);
      try {
        const resolved = await resolveKycPackage(user.kycDocumentUri);
        if (!resolved) {
          closePreview();
          Linking.openURL(user.kycDocumentUri).catch(() =>
            Alert.alert('שגיאה', 'לא ניתן לפתוח את מסמך ה-KYC'),
          );
          return;
        }
        setPreviewData(resolved);
      } catch (error) {
        setPreviewError('טעינת החבילה נכשלה, ננסה לפתוח את הקובץ המקורי.');
        Linking.openURL(user.kycDocumentUri).catch(() =>
          Alert.alert('שגיאה', 'לא ניתן לפתוח את מסמך ה-KYC'),
        );
      } finally {
        setPreviewLoading(false);
      }
    },
    [closePreview],
  );

  const approveRequest = useCallback(
    async (user: User) => {
      setProcessingId(user.id);
      try {
        await requireUnlock('admin.approval');
        await usersAgent.updateKyc(user.id, 'verified');
        if (user.publicKey) {
          const existingReceipt = await loadKycReceipt(user.publicKey);
          if (!existingReceipt) {
            await issueKycReceipt(user.publicKey, { userId: user.id });
          }
        }
        setPending((prev) => prev.filter((item) => item.id !== user.id));
        Alert.alert('הצלחה', 'האימות אושר ונשלחה קבלה חתומה');
      } catch (error) {
        Alert.alert('שגיאה', 'אישור הבקשה נכשל');
      } finally {
        setProcessingId(null);
      }
    },
    [requireUnlock],
  );

  const declineRequest = useCallback(async (user: User) => {
    setProcessingId(user.id);
    try {
      await requireUnlock('admin.approval');
      await usersAgent.updateKyc(user.id, 'rejected');
      setPending((prev) => prev.filter((item) => item.id !== user.id));
      Alert.alert('עודכן', 'הבקשה נדחתה והמשתמש עודכן.');
    } catch (error) {
      Alert.alert('שגיאה', 'דחיית הבקשה נכשלה');
    } finally {
      setProcessingId(null);
    }
  }, [requireUnlock]);

  const policyDescription = useMemo(
    () =>
      policyRequired
        ? 'לקוחות ללא קבלה חתומה ייחסמו בקופה.'
        : 'הקופה תתאפשר ללא אימות מוקדם.',
    [policyRequired],
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}> 
          <TouchableOpacity onPress={back} accessibilityRole="button">
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text.primary }]}>אישורי KYC</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Spinner />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}> 
        <TouchableOpacity onPress={back} accessibilityRole="button"> 
          <ArrowLeft size={24} color={colors.text.primary} /> 
        </TouchableOpacity> 
        <Text style={[styles.title, { color: colors.text.primary }]}>אישורי KYC</Text> 
        <View style={{ width: 24 }} /> 
      </View> 

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}> 
        <View style={[styles.policyCard, { borderColor: colors.border.primary, backgroundColor: colors.surface.primary }]}> 
          <View style={styles.policyHeader}> 
            <ShieldCheck size={20} color={colors.gold} /> 
            <Text style={[styles.policyTitle, { color: colors.text.primary }]}>מדיניות אימות</Text> 
          </View> 
          <View style={styles.policyToggle}> 
            <Text style={{ color: colors.text.primary }}>דרוש KYC לפני רכישה</Text> 
            <Switch
              value={policyRequired}
              onValueChange={togglePolicy}
              thumbColor={policyRequired ? colors.gold : colors.border.primary}
              disabled={policySaving}
            />
          </View>
          <Text style={{ color: colors.text.secondary }}>{policyDescription}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>בקשות ממתינות</Text>
      {pending.length === 0 ? (
        <View style={styles.emptyState}>
          <ShieldCheck size={48} color={colors.interactive.disabled} />
          <Text style={{ color: colors.text.secondary }}>אין בקשות חדשות</Text>
        </View>
        ) : (
          pending.map((user) => (
            <View
              key={user.id}
              style={[styles.requestCard, { borderColor: colors.border.primary, backgroundColor: colors.surface.primary }]}> 
              <View style={styles.requestHeader}> 
                <View> 
                  <Text style={[styles.requestName, { color: colors.text.primary }]}>{user.displayName || user.username}</Text> 
                  <Text style={{ color: colors.text.secondary }}>{user.email}</Text> 
                </View> 
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={() => handlePreview(user)}
                  accessibilityRole="button">
                  <FileText size={18} color={colors.text.primary} />
                  <Text style={{ color: colors.text.primary }}>תצוגה</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: colors.text.secondary }}>
                בקשה: {formatDate(user.kycRequestedAt)}
              </Text>
              {user.kycRequestNotes ? (
                <Text style={[styles.notes, { color: colors.text.secondary }]}>{user.kycRequestNotes}</Text>
              ) : null}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.approveButton, { borderColor: colors.status.success }]}
                  onPress={() => approveRequest(user)}
                  disabled={processingId === user.id}>
                  <ShieldCheck size={18} color={colors.status.success} />
                  <Text style={{ color: colors.status.success }}>אשר</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectButton, { borderColor: colors.status.error }]}
                  onPress={() => declineRequest(user)}
                  disabled={processingId === user.id}>
                  <XCircle size={18} color={colors.status.error} />
                  <Text style={{ color: colors.status.error }}>דחה</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <KycPreviewModal
        visible={previewVisible}
        loading={previewLoading}
        data={previewData}
        error={previewError}
        onClose={closePreview}
        colors={colors}
      />
    </SafeAreaView>
  );
}

function formatDate(value?: string): string {
  if (!value) return 'לא זמין';
  try {
    return new Date(value).toLocaleString('he-IL');
  } catch {
    return value;
  }
}

interface KycPreviewModalProps {
  visible: boolean;
  loading: boolean;
  data: KycPackageResolution | null;
  error: string | null;
  onClose: () => void;
  colors: any;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringifyPayload(payload: unknown): string {
  if (payload === null || payload === undefined) return '';
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function KycPreviewModal({ visible, loading, data, error, onClose, colors }: KycPreviewModalProps) {
  const payload = data?.payload;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>חבילת KYC</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button">
              <X size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.previewCentered}>
              <Spinner />
            </View>
          ) : error ? (
            <Text style={{ color: colors.status.error }}>{error}</Text>
          ) : data ? (
            <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewContent}>
              {data.sender ? (
                <Text style={{ color: colors.text.secondary }}>נשלח ממפתח: {data.sender}</Text>
              ) : null}
              <Text style={{ color: colors.text.secondary }}>
                מקור: {data.source.replace(/^https?:\/\//, '')}
              </Text>
              {isPlainObject(payload) && 'documents' in payload && Array.isArray((payload as any).documents) ? (
                <View style={styles.previewSection}>
                  <Text style={[styles.sectionHeading, { color: colors.text.primary }]}>מסמכים</Text>
                  {(payload as any).documents.map((doc: any, idx: number) => (
                    <Text key={idx} style={{ color: colors.text.secondary }}>
                      {doc?.label || doc?.type || `מסמך ${idx + 1}`}: {doc?.uri || doc?.url || 'לא ידוע'}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Text style={[styles.sectionHeading, { color: colors.text.primary }]}>תוכן מפוענח</Text>
              <Text style={[styles.codeBlock, { color: colors.text.primary, borderColor: colors.border.primary }]}>
                {stringifyPayload(payload)}
              </Text>
            </ScrollView>
          ) : (
            <Text style={{ color: colors.text.secondary }}>לא נמצא מידע להצגה.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  policyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  policyHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  policyTitle: { fontSize: 16, fontWeight: '600' },
  policyToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  requestCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestName: { fontSize: 16, fontWeight: '600' },
  previewButton: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  notes: { fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  approveButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', gap: 6 },
  rejectButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', gap: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  previewCentered: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  previewScroll: { maxHeight: 280 },
  previewContent: { gap: 12 },
  previewSection: { gap: 6 },
  sectionHeading: { fontSize: 14, fontWeight: '600' },
  codeBlock: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'monospace',
    fontSize: 12,
    textAlign: 'left',
  },
});
