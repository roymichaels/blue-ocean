// TODO:KYC-010 on Approve: sign & send kyc.receipt; persist to users-agent
// TODO:KYC-017 require step-up before approve/decline
// TODO:KYC-014 export audit log (CSV) of approvals

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Smartphone,
  Video,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services';
import SettingsAgent from '@/agents/settings-agent';
import usersAgent from '@/agents/users-agent';
import type { User, KycArtifact } from '@/types';
import { Spinner } from '@/ui/primitives';
import {
  issueKycReceipt,
  issueKycCallReceipt,
  loadKycReceipt,
} from '@/services/kycReceipts';
import { canonicalJson } from '@/utils/serialization';
import { sha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';

const POLICY_SETTING_KEY = 'kyc.required';
const POLICY_SOCIAL_KEY = 'kyc.requireSocialProof';
const POLICY_WHATSAPP_KEY = 'kyc.requireWhatsappCall';

export default function KycApprovalsScreen(): React.ReactElement {
  const { colors } = useTheme();
  const { back } = useAppRouter();
  const [policyRequired, setPolicyRequired] = useState(false);
  const [policySocialProof, setPolicySocialProof] = useState(false);
  const [policyWhatsapp, setPolicyWhatsapp] = useState(false);
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [callInFlight, setCallInFlight] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [policyValue, socialValue, whatsappValue, users] = await Promise.all([
        SettingsAgent.getInstance().getSettingValue(POLICY_SETTING_KEY),
        SettingsAgent.getInstance().getSettingValue(POLICY_SOCIAL_KEY),
        SettingsAgent.getInstance().getSettingValue(POLICY_WHATSAPP_KEY),
        usersAgent.getAll(),
      ]);
      setPolicyRequired((policyValue || '').toLowerCase() === 'on');
      setPolicySocialProof((socialValue || '').toLowerCase() === 'on');
      setPolicyWhatsapp((whatsappValue || '').toLowerCase() === 'on');
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

  const toggleSocialPolicy = useCallback(async () => {
    const next = !policySocialProof;
    setPolicySaving(true);
    try {
      await SettingsAgent.getInstance().updateSettingValue(
        POLICY_SOCIAL_KEY,
        next ? 'on' : 'off',
      );
      setPolicySocialProof(next);
    } catch (error) {
      Alert.alert('שגיאה', 'עדכון מדיניות צילום רשתות חברתיות נכשל');
    } finally {
      setPolicySaving(false);
    }
  }, [policySocialProof]);

  const toggleWhatsappPolicy = useCallback(async () => {
    const next = !policyWhatsapp;
    setPolicySaving(true);
    try {
      await SettingsAgent.getInstance().updateSettingValue(
        POLICY_WHATSAPP_KEY,
        next ? 'on' : 'off',
      );
      setPolicyWhatsapp(next);
    } catch (error) {
      Alert.alert('שגיאה', 'עדכון דרישת שיחת WhatsApp נכשל');
    } finally {
      setPolicySaving(false);
    }
  }, [policyWhatsapp]);

  const handlePreview = useCallback((user: User) => {
    const uri = user.kycDocument?.uri;
    if (uri) {
      Linking.openURL(uri).catch(() =>
        Alert.alert('שגיאה', 'לא ניתן לפתוח את מסמך ה-KYC'),
      );
      return;
    }
    if (user.kycRequestNotes) {
      Alert.alert('הערות משתמש', user.kycRequestNotes);
      return;
    }
    Alert.alert('מידע חסר', 'לא נמצאו מסמכי אימות עבור משתמש זה.');
  }, []);

  const hasWhatsappReceipt = useCallback((user: User) => {
    if (!user.kycCallReceipts?.length) return false;
    return user.kycCallReceipts.some((receipt) => receipt.whatsappNumber);
  }, []);

  const completeWhatsappVerification = useCallback(
    async (user: User) => {
      if (!user.publicKey) {
        Alert.alert('שגיאה', 'לא נמצא מפתח ציבורי של הלקוח לצורך חתימה.');
        return;
      }
      if (!user.kycWhatsappNumber) {
        Alert.alert('שגיאה', 'לא הוזן מספר WhatsApp אצל הלקוח.');
        return;
      }
      setCallInFlight(user.id);
      try {
        const receipt = await issueKycCallReceipt(user.publicKey, {
          userId: user.id,
          whatsappNumber: user.kycWhatsappNumber,
        });
        await usersAgent.logKycCallReceipt(user.id, {
          receiptId: receipt.payload.receiptId,
          issuedAt: receipt.payload.issuedAt,
          issuerPublicKey: receipt.payload.issuerPublicKey,
          ts: receipt.payload.ts,
          nonce: receipt.payload.nonce,
          whatsappNumber: user.kycWhatsappNumber,
        });
        Alert.alert('עודכן', 'אישור שיחת ה-WhatsApp נשמר ונחתם.');
        await refreshData();
      } catch (error) {
        Alert.alert('שגיאה', 'שמירת אישור השיחה נכשלה');
      } finally {
        setCallInFlight(null);
      }
    },
    [refreshData],
  );

  const approveRequest = useCallback(
    async (user: User) => {
      setProcessingId(user.id);
      try {
        if (!user.publicKey) {
          throw new Error('MISSING_PUBLIC_KEY');
        }
        let receipt = await loadKycReceipt(user.publicKey);
        if (!receipt) {
          receipt = await issueKycReceipt(user.publicKey, { userId: user.id });
        }
        if (!receipt) {
          throw new Error('RECEIPT_MISSING');
        }
        const receiptHash = Buffer.from(
          sha256(Buffer.from(canonicalJson(receipt.payload))),
        ).toString('hex');
        await usersAgent.updateKyc(user.id, 'verified', undefined, {
          kycReceiptHash: receiptHash,
          kycReceiptSig: receipt.signature,
        });
        setPending((prev) => prev.filter((item) => item.id !== user.id));
        Alert.alert('הצלחה', 'האימות אושר ונשלחה קבלה חתומה');
      } catch (error) {
        if (error instanceof Error && error.message === 'MISSING_PUBLIC_KEY') {
          Alert.alert('שגיאה', 'לא נמצא מפתח ציבורי של הלקוח לצורך חתימה.');
        } else if (error instanceof Error && error.message === 'RECEIPT_MISSING') {
          Alert.alert('שגיאה', 'לא ניתן לטעון קבלה חתומה עבור המשתמש.');
        } else {
          Alert.alert('שגיאה', 'אישור הבקשה נכשל');
        }
      } finally {
        setProcessingId(null);
      }
    },
    [],
  );

  const declineRequest = useCallback(async (user: User) => {
    setProcessingId(user.id);
    try {
      await usersAgent.updateKyc(user.id, 'rejected');
      setPending((prev) => prev.filter((item) => item.id !== user.id));
      Alert.alert('עודכן', 'הבקשה נדחתה והמשתמש עודכן.');
    } catch (error) {
      Alert.alert('שגיאה', 'דחיית הבקשה נכשלה');
    } finally {
      setProcessingId(null);
    }
  }, []);

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
        <View
          style={[styles.policyCard, { borderColor: colors.border.primary, backgroundColor: colors.surface.primary }]}
        >
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
          <View style={styles.policyToggle}>
            <Text style={{ color: colors.text.primary }}>דרוש צילום פרופיל חברתי</Text>
            <Switch
              value={policySocialProof}
              onValueChange={toggleSocialPolicy}
              thumbColor={policySocialProof ? colors.gold : colors.border.primary}
              disabled={policySaving}
            />
          </View>
          <View style={styles.policyToggle}>
            <Text style={{ color: colors.text.primary }}>דרוש אימות שיחת WhatsApp</Text>
            <Switch
              value={policyWhatsapp}
              onValueChange={toggleWhatsappPolicy}
              thumbColor={policyWhatsapp ? colors.gold : colors.border.primary}
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
              style={[
                styles.requestCard,
                { borderColor: colors.border.primary, backgroundColor: colors.surface.primary },
              ]}>
              <View style={styles.requestHeader}>
                <View>
                  <Text style={[styles.requestName, { color: colors.text.primary }]}>
                    {user.displayName || user.username}
                  </Text>
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
              {user.kycWhatsappNumber ? (
                <Text style={{ color: colors.text.secondary }}>
                  מספר WhatsApp: {user.kycWhatsappNumber}
                </Text>
              ) : null}
              {user.kycRequestNotes ? (
                <Text style={[styles.notes, { color: colors.text.secondary }]}>{user.kycRequestNotes}</Text>
              ) : null}
              {Array.isArray(user.kycArtifacts) && user.kycArtifacts.length > 0 ? (
                <View style={styles.artifactList}>
                  {user.kycArtifacts.map((artifact) => (
                    <View
                      key={`${artifact.type}-${artifact.hash}`}
                      style={[styles.artifactRow, { borderColor: colors.border.primary }]}
                    >
                      <View style={styles.artifactIcon}>
                        {renderArtifactIcon(artifact.type, colors.text.primary)}
                      </View>
                      <View style={styles.artifactBody}>
                        <Text style={[styles.artifactTitle, { color: colors.text.primary }]}>
                          {artifactLabel(artifact.type)}
                        </Text>
                        <Text style={{ color: colors.text.secondary }}>
                          {new Date(artifact.ts).toLocaleString('he-IL')} · nonce {artifact.nonce}
                        </Text>
                        <Text style={styles.artifactHash} numberOfLines={1}>
                          {artifact.hash}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.actionsRow}>
                {policyWhatsapp && !hasWhatsappReceipt(user) ? (
                  <TouchableOpacity
                    style={[styles.whatsappButton, { borderColor: colors.gold }]}
                    onPress={() => completeWhatsappVerification(user)}
                    disabled={callInFlight === user.id}>
                    <Smartphone size={18} color={colors.gold} />
                    <Text style={{ color: colors.gold }}>סמן שיחת וידאו</Text>
                  </TouchableOpacity>
                ) : null}
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
  artifactList: { gap: 10 },
  artifactRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  artifactIcon: { width: 32, alignItems: 'center' },
  artifactBody: { flex: 1, gap: 4 },
  artifactTitle: { fontWeight: '600' },
  artifactHash: { fontSize: 12, color: '#777' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' },
  approveButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  rejectButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  whatsappButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
});

function artifactLabel(type: KycArtifact['type']): string {
  switch (type) {
    case 'id-front':
      return 'תעודה - צד קדמי';
    case 'id-back':
      return 'תעודה - צד אחורי';
    case 'selfie-with-id':
      return 'סלפי עם תעודה';
    case 'selfie-video':
      return 'וידאו בדיקת חיות';
    case 'social-proof':
      return 'צילום רשת חברתית';
    case 'whatsapp-call':
      return 'אישור שיחת וידאו';
    default:
      return type;
  }
}

function renderArtifactIcon(type: KycArtifact['type'], color: string): React.ReactElement {
  switch (type) {
    case 'selfie-video':
      return <Video size={18} color={color} />;
    case 'whatsapp-call':
      return <Smartphone size={18} color={color} />;
    default:
      return <FileText size={18} color={color} />;
  }
}


