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
import { ArrowLeft, FileText, ShieldCheck, XCircle } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useAppRouter } from '@/services';
import SettingsAgent from '@/agents/settings-agent';
import usersAgent from '@/agents/users-agent';
import type { User } from '@/types';
import { Spinner } from '@/ui/primitives';
import { issueKycReceipt, loadKycReceipt } from '@/services/kycReceipts';

const POLICY_SETTING_KEY = 'kyc.required';

export default function KycApprovalsScreen(): React.ReactElement {
  const { colors } = useTheme();
  const { back } = useAppRouter();
  const [policyRequired, setPolicyRequired] = useState(false);
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const handlePreview = useCallback((user: User) => {
    if (user.kycDocumentUri) {
      Linking.openURL(user.kycDocumentUri).catch(() =>
        Alert.alert('שגיאה', 'לא ניתן לפתוח את מסמך ה-KYC'),
      );
    } else if (user.kycRequestNotes) {
      Alert.alert('הערות משתמש', user.kycRequestNotes);
    } else {
      Alert.alert('מידע חסר', 'לא נמצאו מסמכי אימות עבור משתמש זה.');
    }
  }, []);

  const approveRequest = useCallback(
    async (user: User) => {
      setProcessingId(user.id);
      try {
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
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  approveButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', gap: 6 },
  rejectButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', gap: 6 },
});
