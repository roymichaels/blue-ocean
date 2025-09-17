import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import { Heading, Text, Button, Card, Badge } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { spacing, radius } from '@/ui/tokens';
import { useAuth } from '@/features/auth/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import SettingsAgent from '@/agents/settings-agent';
import { encryptForTenant, type KycUploadFile } from '@/services/kycUpload';
import { sendDM } from '@/services/dm';
import {
  cleanupTrackedKycCapturedPaths,
  trackKycCapturedPath,
  untrackKycCapturedPath,
} from '@/utils/kycTemp';
import HelperText from '@/ui/form/HelperText';
import Label from '@/ui/form/Label';
import type { User } from '@/types';
import { setUser as persistUser } from '@/features/auth/services/nearUsers';

interface CapturedAsset {
  uri: string;
  name: string;
  type?: string;
  size?: number;
}

type CaptureSlot = 'id' | 'selfie';

type PickerSource = 'camera' | 'library' | 'document';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_SIZE_MB = Math.round(MAX_FILE_BYTES / (1024 * 1024));

function isImage(type?: string): boolean {
  return typeof type === 'string' && type.startsWith('image/');
}

export default function KycVerificationScreen(): React.ReactElement {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user, checkAuthState } = useAuth();
  const { tenantId } = useTenant();

  const [idAsset, setIdAsset] = useState<CapturedAsset | null>(null);
  const [selfieAsset, setSelfieAsset] = useState<CapturedAsset | null>(null);
  const [notes, setNotes] = useState<string>(user?.kycRequestNotes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const kycStatus = user?.kycStatus ?? 'none';
  const isLocked = !user || kycStatus === 'pending';

  useEffect(() => {
    return () => {
      void cleanupTrackedKycCapturedPaths();
    };
  }, []);

  useEffect(() => {
    if ((notes.length === 0 || notes === user?.kycRequestNotes) && user?.kycRequestNotes) {
      setNotes(user.kycRequestNotes);
    }
  }, [user?.kycRequestNotes]);

  const statusLabel = useMemo(() => {
    switch (kycStatus) {
      case 'pending':
        return t('kyc.pending', 'Verification Pending');
      case 'verified':
        return t('kyc.verified', 'Verified');
      case 'rejected':
        return t('kyc.rejected', 'Verification Rejected');
      default:
        return t('kyc.none', 'Not Verified');
    }
  }, [kycStatus, t]);

  const statusDescription = useMemo(() => {
    switch (kycStatus) {
      case 'pending':
        return t('kyc.pendingMessage', 'Your verification request is currently under review.');
      case 'verified':
        return t('kyc.verifiedMessage', 'Your account is verified. You can now place orders.');
      case 'rejected':
        return t(
          'kyc.rejectedMessage',
          'We were unable to verify your identity. Please try again with clearer photos.',
        );
      default:
        return t(
          'kyc.instructionsIntro',
          'Submit a photo ID and a selfie so we can verify your identity before you place an order.',
        );
    }
  }, [kycStatus, t]);

  const ensureWithinLimit = useCallback(
    (asset: Partial<CapturedAsset> & { size?: number }): boolean => {
      if (typeof asset.size === 'number' && asset.size > MAX_FILE_BYTES) {
        setError(t('kyc.fileTooLarge', 'Files must be {size} MB or smaller.', { size: MAX_FILE_SIZE_MB }));
        return false;
      }
      return true;
    },
    [t],
  );

  const requestPermission = useCallback(
    async (source: PickerSource): Promise<boolean> => {
      if (Platform.OS === 'web') return true;
      try {
        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            setError(t('kyc.permissionDenied', 'Camera access is required to continue.'));
            return false;
          }
          return true;
        }
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setError(t('kyc.permissionDenied', 'Media library access is required to continue.'));
          return false;
        }
        return true;
      } catch (err) {
        setError(t('kyc.permissionDenied', 'Camera access is required to continue.'));
        return false;
      }
    },
    [t],
  );

  const handlePick = useCallback(
    async (slot: CaptureSlot, source: PickerSource) => {
      setError(null);
      setSuccessMessage(null);
      if (source !== 'document' && !(await requestPermission(source))) {
        return;
      }

      try {
        let picked: ImagePicker.ImagePickerAsset | DocumentPicker.DocumentPickerAsset | null = null;
        if (source === 'document') {
          const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
          if (result.canceled || !result.assets?.length) return;
          picked = result.assets[0];
        } else if (source === 'camera') {
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
          if (result.canceled || !result.assets?.length) return;
          picked = result.assets[0];
        } else {
          const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
          if (result.canceled || !result.assets?.length) return;
          picked = result.assets[0];
        }

        if (!picked?.uri) return;

        const size =
          typeof (picked as any).fileSize === 'number'
            ? (picked as any).fileSize
            : typeof (picked as any).size === 'number'
            ? (picked as any).size
            : undefined;

        const prepared: CapturedAsset = {
          uri: picked.uri,
          name:
            picked.name ||
            (picked as any).fileName ||
            `${slot}-${Date.now()}.${picked.mimeType?.split('/')[1] ?? 'jpg'}`,
          type: picked.mimeType || (picked as any).type,
          size,
        };

        if (!ensureWithinLimit(prepared)) {
          return;
        }

        trackKycCapturedPath(prepared.uri);
        if (slot === 'id') {
          if (idAsset) untrackKycCapturedPath(idAsset.uri);
          setIdAsset(prepared);
        } else {
          if (selfieAsset) untrackKycCapturedPath(selfieAsset.uri);
          setSelfieAsset(prepared);
        }
      } catch (err) {
        setError(t('kyc.selectionError', 'We could not open that file. Try again.'));
      }
    },
    [ensureWithinLimit, idAsset, requestPermission, selfieAsset, t],
  );

  const removeAsset = useCallback(
    (slot: CaptureSlot) => {
      if (slot === 'id' && idAsset) {
        untrackKycCapturedPath(idAsset.uri);
        setIdAsset(null);
      }
      if (slot === 'selfie' && selfieAsset) {
        untrackKycCapturedPath(selfieAsset.uri);
        setSelfieAsset(null);
      }
      setSuccessMessage(null);
    },
    [idAsset, selfieAsset],
  );

  const handleSubmit = useCallback(async () => {
    if (!user) {
      setError(t('kyc.loginRequired', 'Connect your wallet to submit verification.'));
      return;
    }
    if (!idAsset || !selfieAsset) {
      setError(t('kyc.missingDocuments', 'Add both an ID image and a selfie before submitting.'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const adminKeys = await SettingsAgent.getInstance().getAdminPublicKeys();
      const tenantPublicKey = adminKeys[0];
      if (!tenantPublicKey) {
        throw new Error('TENANT_PUBLIC_KEY_MISSING');
      }

      const files: KycUploadFile[] = [
        { uri: idAsset.uri, name: idAsset.name, type: idAsset.type },
        { uri: selfieAsset.uri, name: selfieAsset.name, type: selfieAsset.type },
      ];

      const encrypted = await encryptForTenant(tenantPublicKey, files);

      await sendDM(tenantPublicKey, 'kyc.request', {
        userId: user.id,
        tenantId: tenantId ?? 'default',
        document: encrypted,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      const updated: User = {
        ...user,
        kycStatus: 'pending',
        kycRequestedAt: new Date().toISOString(),
        kycRequestNotes: notes.trim() ? notes.trim() : undefined,
        kycDocument: encrypted,
      };
      await persistUser(updated);
      await checkAuthState();

      setIdAsset(null);
      setSelfieAsset(null);
      setNotes('');
      setSuccessMessage(t('kyc.requestSubmittedMessage', 'Your verification request has been submitted.'));
    } catch (err) {
      if (err instanceof Error && err.message === 'TENANT_PUBLIC_KEY_MISSING') {
        setError(t('kyc.tenantUnavailable', 'Verification is unavailable right now.'));
      } else {
        setError(t('kyc.submissionError', 'We could not send your verification. Try again.'));
      }
    } finally {
      await cleanupTrackedKycCapturedPaths();
      setSubmitting(false);
    }
  }, [
    checkAuthState,
    idAsset,
    notes,
    selfieAsset,
    t,
    tenantId,
    user,
  ]);

  const canSubmit =
    !isLocked && !!idAsset && !!selfieAsset && (kycStatus === 'none' || kycStatus === 'rejected');

  return (
    <ScrollArea backgroundColor={colors.canvas}>
      <Container>
        <Stack gap="spacer24" style={styles.page}>
          <Stack gap="spacer12">
            <Heading size="xl">{t('kyc.verification', 'KYC Verification')}</Heading>
            <Card style={[styles.statusCard, { backgroundColor: colors.surface.primary }]}>
              <Stack gap="spacer8">
                <Stack direction="horizontal" gap="spacer12" align="center">
                  <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>
                    {t('kyc.viewStatusLabel', 'Current status')}
                  </Text>
                  <Badge label={statusLabel} accessibilityLabel={statusLabel} />
                </Stack>
                <Text>{statusDescription}</Text>
              </Stack>
            </Card>
          </Stack>

          {kycStatus !== 'verified' ? (
            <Stack gap="spacer16">
              <Card style={[styles.instructionsCard, { backgroundColor: colors.surface.primary }]}>
                <Stack gap="spacer8">
                  <Text style={styles.instructionsTitle}>{t('kyc.instructionsTitle', 'What you will need')}</Text>
                  <Text>{t('kyc.instructionsId', 'A clear photo or scan of your government-issued ID.')}</Text>
                  <Text>{t('kyc.instructionsSelfie', 'A selfie that matches your ID and shows your face clearly.')}</Text>
                  <Text>{t('kyc.instructionsTip', 'Use good lighting and avoid glare or blurry images.')}</Text>
                </Stack>
              </Card>

              <Stack gap="spacer16">
                <Stack gap="spacer8">
                  <Text style={styles.sectionTitle}>{t('kyc.idSectionTitle', 'Identity document')}</Text>
                  {idAsset ? (
                    <Card style={[styles.assetCard, { backgroundColor: colors.surface.primary }]}>
                      <Stack gap="spacer12">
                        {isImage(idAsset.type) ? (
                          <Image
                            source={{ uri: idAsset.uri }}
                            style={styles.previewImage}
                            accessibilityLabel={t('kyc.idPreviewAlt', 'Selected ID preview')}
                          />
                        ) : (
                          <Text>{idAsset.name}</Text>
                        )}
                        <Button
                          title={t('kyc.removeAttachment', 'Remove')}
                          onPress={() => removeAsset('id')}
                          testID="kyc-remove-id"
                          accessibilityRole="button"
                        />
                      </Stack>
                    </Card>
                  ) : (
                    <Stack direction="horizontal" gap="spacer12" style={styles.actionRow}>
                      <Button
                        title={t('kyc.captureId', 'Capture ID photo')}
                        onPress={() => void handlePick('id', 'camera')}
                        testID="kyc-id-camera"
                        accessibilityRole="button"
                      />
                      <Button
                        title={t('kyc.uploadId', 'Upload from library')}
                        onPress={() => void handlePick('id', 'library')}
                        testID="kyc-id-library"
                        accessibilityRole="button"
                      />
                      <Button
                        title={t('kyc.uploadIdFile', 'Upload a file')}
                        onPress={() => void handlePick('id', 'document')}
                        testID="kyc-id-document"
                        accessibilityRole="button"
                      />
                    </Stack>
                  )}
                </Stack>

                <Stack gap="spacer8">
                  <Text style={styles.sectionTitle}>{t('kyc.selfieSectionTitle', 'Selfie')}</Text>
                  {selfieAsset ? (
                    <Card style={[styles.assetCard, { backgroundColor: colors.surface.primary }]}>
                      <Stack gap="spacer12">
                        {isImage(selfieAsset.type) ? (
                          <Image
                            source={{ uri: selfieAsset.uri }}
                            style={styles.previewImage}
                            accessibilityLabel={t('kyc.selfiePreviewAlt', 'Selected selfie preview')}
                          />
                        ) : (
                          <Text>{selfieAsset.name}</Text>
                        )}
                        <Button
                          title={t('kyc.removeAttachment', 'Remove')}
                          onPress={() => removeAsset('selfie')}
                          testID="kyc-remove-selfie"
                          accessibilityRole="button"
                        />
                      </Stack>
                    </Card>
                  ) : (
                    <Stack direction="horizontal" gap="spacer12" style={styles.actionRow}>
                      <Button
                        title={t('kyc.captureSelfie', 'Capture selfie')}
                        onPress={() => void handlePick('selfie', 'camera')}
                        testID="kyc-selfie-camera"
                        accessibilityRole="button"
                      />
                      <Button
                        title={t('kyc.uploadSelfie', 'Upload from library')}
                        onPress={() => void handlePick('selfie', 'library')}
                        testID="kyc-selfie-library"
                        accessibilityRole="button"
                      />
                    </Stack>
                  )}
                </Stack>

                <Stack gap="spacer4">
                  <Label>{t('kyc.notesForAdmin', 'Notes for Admin (Optional)')}</Label>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t(
                      'kyc.notesPlaceholder',
                      "Share any context that helps us verify your identity",
                    )}
                    style={[styles.notesInput, { borderColor: colors.border.primary, color: colors.text.primary }]}
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    numberOfLines={4}
                    accessible
                    accessibilityLabel={t('kyc.notesForAdmin', 'Notes for Admin (Optional)')}
                  />
                </Stack>

                {error ? (
                  <HelperText error>{error}</HelperText>
                ) : null}
                {!user ? (
                  <HelperText error>
                    {t('kyc.loginRequired', 'Connect your wallet to submit verification.')}
                  </HelperText>
                ) : null}
                {successMessage ? (
                  <HelperText>{successMessage}</HelperText>
                ) : null}

                <Button
                  title={t('kyc.requestVerification', 'Request Verification')}
                  onPress={() => void handleSubmit()}
                  loading={submitting}
                  disabled={!canSubmit || submitting}
                  testID="kyc-submit"
                  accessibilityRole="button"
                />
              </Stack>
            </Stack>
          ) : (
            <Card style={[styles.instructionsCard, { backgroundColor: colors.surface.primary }]}>
              <Text>{t('kyc.verifiedMessage', 'Your account is verified. You can now place orders.')}</Text>
            </Card>
          )}
        </Stack>
      </Container>
    </ScrollArea>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingVertical: spacing.spacer24,
  },
  statusCard: {
    padding: spacing.spacer16,
  },
  statusLabel: {
    fontWeight: '600',
  },
  instructionsCard: {
    padding: spacing.spacer16,
  },
  instructionsTitle: {
    fontWeight: '600',
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  assetCard: {
    padding: spacing.spacer16,
    borderRadius: radius.lg,
  },
  actionRow: {
    flexWrap: 'wrap',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: '#0001',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.spacer12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
