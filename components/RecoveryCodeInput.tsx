import React, { useCallback, useMemo, useState } from 'react';
import { View, Modal, StyleSheet, Platform } from 'react-native';
import { TextField, Button, Text, Heading } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { spacing, radius } from '@/ui/tokens';
import { parseRecoveryDeeplink, type RecoveryIntent } from '@/utils/recovery/qrSigning';

interface RecoveryCodeInputProps {
  value: RecoveryIntent | null;
  onChange: (intent: RecoveryIntent | null) => void;
  onError?: (error: Error) => void;
}

export default function RecoveryCodeInput({ value, onChange, onError }: RecoveryCodeInputProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [rawPayload, setRawPayload] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const intent = useMemo<RecoveryIntent | null>(() => {
    if (!value) return null;
    return {
      tenantId: value.tenantId,
      codeId: value.codeId,
      code: value.code,
      deviceId: value.deviceId,
      targetPublicKey: value.targetPublicKey,
      approvalsRequired: value.approvalsRequired,
    };
  }, [value]);

  const updateIntent = useCallback(
    (field: keyof RecoveryIntent, next: string) => {
      const current: RecoveryIntent = intent ?? {
        tenantId: '1',
        codeId: '',
        code: '',
        deviceId: '',
      };
      const payload: RecoveryIntent = {
        ...current,
        [field]: field === 'approvalsRequired' ? (next ? Number.parseInt(next, 10) || undefined : undefined) : next,
      } as RecoveryIntent;
      if (!payload.tenantId) payload.tenantId = '1';
      onChange(payload);
    },
    [intent, onChange],
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setParseError(null);
  }, [onChange]);

  const handleParse = useCallback(() => {
    const parsed = parseRecoveryDeeplink(rawPayload);
    if (!parsed) {
      const error = new Error('Invalid recovery payload');
      setParseError(
        t(
          'auth.recovery.invalidPayload',
          'We could not understand that recovery payload. Double-check the QR contents and try again.',
        ),
      );
      onError?.(error);
      return;
    }
    setParseError(null);
    onChange(parsed);
    setModalVisible(false);
    setRawPayload('');
  }, [onChange, onError, rawPayload, t]);

  const tenantId = intent?.tenantId ?? '1';
  const approvalsRequired = intent?.approvalsRequired;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextField
          value={tenantId}
          onChangeText={(next) => updateIntent('tenantId', next)}
          placeholder={t('auth.recovery.tenantPlaceholder', 'Tenant ID')}
          style={{ flex: 1 }}
        />
        <View style={{ width: spacing.spacer12 }} />
        <Button
          title={t('auth.recovery.scanQr', Platform.select({ ios: 'Scan QR', default: 'Paste QR' }))}
          onPress={() => setModalVisible(true)}
        />
      </View>
      <View style={styles.fieldSpacing} />
      <TextField
        value={intent?.codeId ?? ''}
        onChangeText={(next) => updateIntent('codeId', next)}
        placeholder={t('auth.recovery.codeIdPlaceholder', 'Code ID')}
      />
      <View style={styles.fieldSpacing} />
      <TextField
        value={intent?.code ?? ''}
        onChangeText={(next) => updateIntent('code', next)}
        placeholder={t('auth.recovery.codePlaceholder', 'One-time code')}
      />
      <View style={styles.fieldSpacing} />
      <TextField
        value={intent?.deviceId ?? ''}
        onChangeText={(next) => updateIntent('deviceId', next)}
        placeholder={t('auth.recovery.devicePlaceholder', 'Device fingerprint')}
      />
      <View style={styles.fieldSpacing} />
      <TextField
        value={intent?.targetPublicKey ?? ''}
        onChangeText={(next) => updateIntent('targetPublicKey', next)}
        placeholder={t('auth.recovery.targetKeyPlaceholder', 'Target public key (optional)')}
      />
      <View style={styles.fieldSpacing} />
      <TextField
        value={approvalsRequired ? String(approvalsRequired) : ''}
        onChangeText={(next) => updateIntent('approvalsRequired', next)}
        keyboardType="number-pad"
        placeholder={t('auth.recovery.thresholdPlaceholder', 'Required approvals (optional)')}
      />
      <View style={styles.actions}>
        <Button
          title={t('auth.recovery.clear', 'Clear')}
          onPress={handleClear}
          disabled={!intent}
          style={{ backgroundColor: colors.surface.secondary }}
          textStyle={{ color: colors.text.primary }}
        />
      </View>
      {parseError ? (
        <Text style={[styles.errorText, { color: colors.status.danger }]} accessibilityRole="alert">
          {parseError}
        </Text>
      ) : null}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.6)' }]}> 
          <View style={[styles.modalBody, { backgroundColor: colors.surface.primary }]}> 
            <Heading size="md" style={{ marginBottom: spacing.spacer12 }}>
              {t('auth.recovery.modalTitle', 'Paste recovery payload')}
            </Heading>
            <TextField
              value={rawPayload}
              onChangeText={setRawPayload}
              placeholder={t('auth.recovery.modalPlaceholder', 'Paste QR or deeplink contents here')}
              style={styles.modalInput}
            />
            <View style={styles.modalButtons}>
              <Button
                title={t('common.cancel', 'Cancel')}
                onPress={() => {
                  setModalVisible(false);
                  setRawPayload('');
                  setParseError(null);
                }}
                style={{ backgroundColor: colors.surface.secondary }}
                textStyle={{ color: colors.text.primary }}
              />
              <View style={{ width: spacing.spacer12 }} />
              <Button
                title={t('auth.recovery.applyPayload', 'Use payload')}
                onPress={handleParse}
                disabled={!rawPayload.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldSpacing: {
    height: spacing.spacer12,
  },
  actions: {
    marginTop: spacing.spacer16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  errorText: {
    marginTop: spacing.spacer12,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.spacer16,
  },
  modalBody: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radius.lg,
    padding: spacing.spacer16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  modalInput: {
    minHeight: 120,
    textAlignVertical: 'top' as any,
  },
  modalButtons: {
    marginTop: spacing.spacer16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});

