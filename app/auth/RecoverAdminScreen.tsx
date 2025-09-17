import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScrollArea, Container } from '@/ui/layout';
import { Heading, Text, Button } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { spacing } from '@/ui/tokens';
import RecoveryCodeInput from '@/components/RecoveryCodeInput';
import {
  submitRecoveryRequest,
  parseRecoveryDeeplink,
  type RecoveryIntent,
} from '@/utils/recovery/qrSigning';
import { useLocalSearchParams } from 'expo-router';

interface RecoverParams {
  payload?: string;
}

export default function RecoverAdminScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const params = useLocalSearchParams<RecoverParams>();
  const [intent, setIntent] = useState<RecoveryIntent | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params?.payload) {
      const parsed = parseRecoveryDeeplink(Array.isArray(params.payload) ? params.payload[0] : params.payload);
      if (parsed) {
        setIntent(parsed);
      }
    }
  }, [params?.payload]);

  const isValid = useMemo(() => {
    if (!intent) return false;
    return Boolean(intent.codeId && intent.code && intent.deviceId);
  }, [intent]);

  const handleSubmit = useCallback(async () => {
    if (!intent) {
      setStatus('error');
      setMessage(t('auth.recovery.missingFields', 'Provide a code, code ID, and device fingerprint before submitting.'));
      return;
    }
    setSubmitting(true);
    setStatus('idle');
    setMessage('');
    try {
      await submitRecoveryRequest(intent);
      setStatus('success');
      setMessage(
        t(
          'auth.recovery.requestSent',
          'Recovery request submitted. Ask two active administrators to approve the code.',
        ),
      );
    } catch (err) {
      setStatus('error');
      const detail = err instanceof Error ? err.message : String(err);
      setMessage(
        t('auth.recovery.requestFailed', 'We could not broadcast the recovery request: {{error}}', {
          error: detail,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }, [intent, t]);

  return (
    <ScrollArea backgroundColor={colors.canvas}>
      <Container>
        <Heading size="xl">{t('auth.recovery.title', 'Recover admin access')}</Heading>
        <Text style={[styles.lead, { color: colors.text.secondary }]}>
          {t(
            'auth.recovery.description',
            'Use a signed recovery code to ask the remaining administrators for approval. Once two admins verify the code, you will receive a short-lived grant to restore access on this device.',
          )}
        </Text>
        <View style={styles.section}>
          <Heading size="sm" style={{ color: colors.text.primary }}>
            {t('auth.recovery.codeSection', 'Recovery details')}
          </Heading>
          <Text style={{ color: colors.text.secondary, marginBottom: spacing.spacer16 }}>
            {t(
              'auth.recovery.codeHelp',
              'Paste the QR payload or manually enter the fields that were shared with you by the security desk.',
            )}
          </Text>
          <RecoveryCodeInput value={intent} onChange={setIntent} onError={(err) => setMessage(err.message)} />
        </View>
        <View style={styles.section}>
          <Heading size="sm" style={{ color: colors.text.primary }}>
            {t('auth.recovery.multiSigHeading', 'Multi-approver workflow')}
          </Heading>
          <Text style={{ color: colors.text.secondary }}>
            {t(
              'auth.recovery.multiSigCopy',
              'Your request is logged on Waku and requires at least two administrators to approve. Each approval is rate limited to prevent brute-force attempts.',
            )}
          </Text>
        </View>
        <View style={styles.actions}>
          <Button
            title={t('auth.recovery.submit', 'Send recovery request')}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
            loading={submitting}
          />
        </View>
        {status !== 'idle' ? (
          <Text
            style={{
              marginTop: spacing.spacer16,
              color: status === 'success' ? colors.status.success : colors.status.danger,
            }}
            accessibilityRole="status"
          >
            {message}
          </Text>
        ) : null}
      </Container>
    </ScrollArea>
  );
}

const styles = StyleSheet.create({
  lead: {
    marginTop: spacing.spacer8,
    marginBottom: spacing.spacer16,
  },
  section: {
    marginTop: spacing.spacer24,
  },
  actions: {
    marginTop: spacing.spacer24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

