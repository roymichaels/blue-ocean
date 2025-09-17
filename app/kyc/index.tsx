import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ScrollArea, Container, Stack } from '@/ui/layout';
import { Heading, Text, Button, Card, Badge } from '@/ui/primitives';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { spacing, radius } from '@/ui/tokens';
import { useAuth } from '@/features/auth/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import SettingsAgent from '@/agents/settings-agent';
import { useKycCapture } from './hooks/useKycCapture';
import VideoCapture from './components/VideoCapture';
import { encryptForTenant, type KycUploadFile } from '@/services/kycUpload';
import { sendDM } from '@/services/dm';
import { cleanupTrackedKycCapturedPaths } from '@/utils/kycTemp';
import type { User } from '@/types';
import { setUser as persistUser } from '@/features/auth/services/nearUsers';

interface PolicyState {
  requireSocialProof: boolean;
  requireWhatsapp: boolean;
  appName: string;
}

const INITIAL_POLICY: PolicyState = {
  requireSocialProof: false,
  requireWhatsapp: false,
  appName: 'Blue Ocean',
};

export default function KycVerificationScreen(): React.ReactElement {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user, checkAuthState } = useAuth();
  const { tenantId } = useTenant();
  const [policy, setPolicy] = useState<PolicyState>(INITIAL_POLICY);
  const [notes, setNotes] = useState(user?.kycRequestNotes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const capture = useKycCapture({
    requireSocialProof: policy.requireSocialProof,
    requireWhatsapp: policy.requireWhatsapp,
  });
  const { steps, currentStepIndex, artifacts, requireWhatsapp } = capture;
  const [activeStep, setActiveStep] = useState(currentStepIndex);

  useEffect(() => {
    setActiveStep(currentStepIndex);
  }, [currentStepIndex]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const instance = SettingsAgent.getInstance();
        const [social, whatsapp, name] = await Promise.all([
          instance.getSettingValue('kyc.requireSocialProof'),
          instance.getSettingValue('kyc.requireWhatsappCall'),
          instance.getSettingValue('appName'),
        ]);
        if (!mounted) return;
        setPolicy({
          requireSocialProof: (social || '').toLowerCase() === 'on',
          requireWhatsapp: (whatsapp || '').toLowerCase() === 'on',
          appName: name || INITIAL_POLICY.appName,
        });
      } catch (err) {
        // Ignore policy fetch errors and fall back to defaults
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if ((notes.length === 0 || notes === user?.kycRequestNotes) && user?.kycRequestNotes) {
      setNotes(user.kycRequestNotes);
    }
  }, [user?.kycRequestNotes]);

  const kycStatus = user?.kycStatus ?? 'none';
  const isLocked = !user || kycStatus === 'pending';

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
          'Submit the requested captures so we can verify your identity before you place an order.',
        );
    }
  }, [kycStatus, t]);

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof Error) {
        if (err.message === 'file-too-large') {
          setError(t('kyc.fileTooLarge', 'Files must be 15 MB or smaller.'));
          return;
        }
        if (err.message === 'camera-permission-denied') {
          setError(t('kyc.permissionDenied', 'Camera access is required to continue.'));
          return;
        }
        if (err.message === 'library-permission-denied') {
          setError(t('kyc.permissionDenied', 'Media library access is required to continue.'));
          return;
        }
      }
      setError(t('kyc.selectionError', 'We could not open that file. Try again.'));
    },
    [t],
  );

  const captureId = useCallback(
    async (type: 'id-front' | 'id-back') => {
      try {
        setError(null);
        await capture.capturePhoto(
          type,
          'camera',
          type === 'id-front' ? ImagePicker.CameraType.back : ImagePicker.CameraType.back,
          { side: type === 'id-front' ? 'front' : 'back' },
        );
      } catch (err) {
        handleError(err);
      }
    },
    [capture, handleError],
  );

  const captureSelfieWithId = useCallback(async () => {
    try {
      setError(null);
      await capture.capturePhoto('selfie-with-id', 'camera', ImagePicker.CameraType.front, {
        pose: 'hold-id',
      });
    } catch (err) {
      handleError(err);
    }
  }, [capture, handleError]);

  const captureSocialProof = useCallback(async () => {
    try {
      setError(null);
      await capture.capturePhoto('social-proof', 'library', ImagePicker.CameraType.back, {
        source: 'social-screenshot',
      });
    } catch (err) {
      handleError(err);
    }
  }, [capture, handleError]);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      setError(t('kyc.loginRequired', 'Connect your wallet to submit verification.'));
      return;
    }
    if (!capture.canSubmit) {
      setError(t('kyc.missingDocuments', 'Complete all required steps before submitting.'));
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

      const files: KycUploadFile[] = artifacts.map((artifact) => ({
        uri: artifact.uri,
        name: artifact.name,
        type: artifact.mimeType,
        artifactType: artifact.type,
        capturedAt: artifact.capturedAt,
        nonce: artifact.nonce,
        metadata: {
          ...(artifact.metadata ?? {}),
          size: artifact.size,
          durationMs: artifact.durationMs,
        },
      }));

      const encrypted = await encryptForTenant(tenantPublicKey, files);
      const bundle = {
        ...encrypted,
        notes: notes.trim() ? notes.trim() : undefined,
        whatsappNumber: capture.requireWhatsapp
          ? capture.whatsappNumber.trim() || undefined
          : undefined,
      };

      await sendDM(tenantPublicKey, 'kyc.request', {
        userId: user.id,
        tenantId: tenantId ?? 'default',
        bundle,
      });

      const updated: User = {
        ...user,
        kycStatus: 'pending',
        kycRequestedAt: new Date().toISOString(),
        kycRequestNotes: notes.trim() ? notes.trim() : undefined,
        kycDocument: encrypted.document,
        kycArtifacts: encrypted.artifacts,
        kycBundleNonce: encrypted.nonce,
        kycBundleSig: encrypted.sig,
        kycWhatsappNumber: bundle.whatsappNumber ?? undefined,
      };
      await persistUser(updated);
      await checkAuthState();
      capture.reset();
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
    artifacts,
    capture,
    checkAuthState,
    notes,
    t,
    tenantId,
    user,
  ]);

  const canSubmit = capture.canSubmit && !isLocked && (kycStatus === 'none' || kycStatus === 'rejected');

  const handleCaptureIdFront = useCallback(() => {
    void captureId('id-front');
  }, [captureId]);

  const handleCaptureIdBack = useCallback(() => {
    void captureId('id-back');
  }, [captureId]);

  const handleCaptureSelfieStep = useCallback(() => {
    void captureSelfieWithId();
  }, [captureSelfieWithId]);

  const handleCaptureSocialStep = useCallback(() => {
    void captureSocialProof();
  }, [captureSocialProof]);

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
            <Stack gap="spacer24">
              <Stack gap="spacer16">
                <Heading size="lg">{t('kyc.stepsTitle', 'Verification steps')}</Heading>
                <View style={styles.stepper}>
                  {steps.map((step, index) => {
                    const isComplete = index < currentStepIndex;
                    const isActive = index === activeStep;
                    return (
                      <View key={step.key} style={styles.stepItem}>
                        <Button
                          title={`${index + 1}. ${step.title}`}
                          onPress={() => setActiveStep(index)}
                          disabled={index > currentStepIndex}
                          style={() => [
                            styles.stepButton,
                            isActive && styles.stepButtonActive,
                            isComplete && styles.stepButtonComplete,
                          ]}
                          textStyle={styles.stepButtonText}
                        />
                        {index === currentStepIndex && !isComplete ? (
                          <Text style={[styles.stepDescription, { color: colors.text.secondary }]}>
                            {step.description}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </Stack>

              <Card style={[styles.stepCard, { backgroundColor: colors.surface.primary }]}> 
                {renderStepContent({
                  activeStep,
                  capture,
                  appName: policy.appName,
                  onCaptureIdFront: handleCaptureIdFront,
                  onCaptureIdBack: handleCaptureIdBack,
                  onCaptureSelfie: handleCaptureSelfieStep,
                  onCaptureSocial: handleCaptureSocialStep,
                })}
              </Card>

              {activeStep >= steps.length - 1 ? (
                <Card style={[styles.reviewCard, { backgroundColor: colors.surface.primary }]}> 
                  {renderReviewSection({
                    artifacts,
                    colors,
                    t,
                    capture,
                    notes,
                    setNotes,
                    requireWhatsapp,
                    whatsappNumber: capture.whatsappNumber,
                    setWhatsappNumber: capture.setWhatsappNumber,
                  })}
                </Card>
              ) : null}

              {error ? <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text> : null}
              {successMessage ? (
                <Text style={[styles.successText, { color: colors.status.success }]}>{successMessage}</Text>
              ) : null}

              <Button
                title={t('kyc.submit', 'Submit for review')}
                onPress={() => void handleSubmit()}
                disabled={!canSubmit || submitting}
                testID="kyc-submit"
              />
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </ScrollArea>
  );
}

function renderStepContent(params: {
  activeStep: number;
  capture: ReturnType<typeof useKycCapture>;
  appName: string;
  onCaptureIdFront: () => void;
  onCaptureIdBack: () => void;
  onCaptureSelfie: () => void;
  onCaptureSocial: () => void;
}): React.ReactElement {
  const { activeStep, capture, appName, onCaptureIdFront, onCaptureIdBack, onCaptureSelfie, onCaptureSocial } = params;
  const step = capture.steps[activeStep];
  const artifact = capture.getArtifact(step.key as any);
  switch (step.key) {
    case 'id-front':
    case 'id-back': {
      return (
        <Stack gap="spacer16">
          <Text>{step.description}</Text>
          {artifact ? (
            <Image source={{ uri: artifact.uri }} style={styles.previewImage} />
          ) : null}
          <Button
            title={artifact ? 'צלם/י מחדש' : 'צלם/י'}
            onPress={() => {
              if (step.key === 'id-front') {
                onCaptureIdFront();
              } else {
                onCaptureIdBack();
              }
            }}
            testID={step.key === 'id-front' ? 'kyc-capture-id-front' : 'kyc-capture-id-back'}
          />
        </Stack>
      );
    }
    case 'selfie-with-id':
      return (
        <Stack gap="spacer16">
          <Text>החזיקו את התעודה מול הפנים וצילמו סלפי ברור.</Text>
          {artifact ? <Image source={{ uri: artifact.uri }} style={styles.previewImage} /> : null}
          <Button
            title={artifact ? 'צלם/י מחדש' : 'צלם/י סלפי'}
            onPress={onCaptureSelfie}
            testID="kyc-capture-selfie-id"
          />
        </Stack>
      );
    case 'selfie-video':
      return (
        <Stack gap="spacer16">
          <Text>עיינו בהנחיות על המסך והקליטו וידאו של 3-5 שניות.</Text>
          <Text>וודאו שאתם מציינים בקול "האנדרגראונד" ואת התאריך והשעה הנוכחיים.</Text>

          <VideoCapture
            appName={appName}
            livenessPrompt={capture.livenessState?.prompt ?? null}
            livenessNonce={capture.livenessState?.nonce ?? null}
            prepareLiveness={capture.prepareLiveness}
            recordLiveness={capture.livenessVideoCapture}
            onRecorded={() => {}}
          />
        </Stack>
      );
    case 'social-proof':
      return (
        <Stack gap="spacer16">
          <Text>העלה/י צילום מסך של הפרופיל החברתי המבוקש.</Text>
          {artifact ? <Image source={{ uri: artifact.uri }} style={styles.previewImage} /> : null}
          <Button
            title={artifact ? 'העלה/י מחדש' : 'בחר/י צילום מסך'}
            onPress={onCaptureSocial}
            testID="kyc-upload-social"
          />
        </Stack>
      );
    case 'review':
    default:
      return (
        <Stack gap="spacer16">
          <Text>עברו על הפרטים לפני השליחה.</Text>
        </Stack>
      );
  }
}

function renderReviewSection(params: {
  artifacts: ReturnType<typeof useKycCapture>['artifacts'];
  colors: any;
  t: (key: string, fallback: string, params?: Record<string, unknown>) => string;
  capture: ReturnType<typeof useKycCapture>;
  notes: string;
  setNotes: (value: string) => void;
  requireWhatsapp: boolean;
  whatsappNumber: string;
  setWhatsappNumber: (value: string) => void;
}): React.ReactElement {
  const { artifacts, colors, t, capture, notes, setNotes, requireWhatsapp, whatsappNumber, setWhatsappNumber } = params;
  return (
    <Stack gap="spacer16">
      <Heading size="md">{t('kyc.reviewArtifacts', 'Captured artifacts')}</Heading>
      <Stack gap="spacer12">
        {artifacts.map((artifact) => (
          <Card key={`${artifact.type}-${artifact.nonce}`} style={[styles.artifactCard, { backgroundColor: colors.surface.secondary }]}> 
            <Stack gap="spacer8">
              <Text style={{ fontWeight: '600' }}>{artifactLabel(artifact.type)}</Text>
              <Text style={{ color: colors.text.secondary }}>
                {new Date(artifact.capturedAt).toLocaleString('he-IL')} · nonce {artifact.nonce}
              </Text>
              <Text style={styles.hashText} numberOfLines={1}>
                {artifact.uri}
              </Text>
              <Button title={t('kyc.removeAttachment', 'Remove')} onPress={() => capture.removeArtifact(artifact.type)} />
            </Stack>
          </Card>
        ))}
      </Stack>
      <View>
        <Text style={{ marginBottom: spacing['spacer8'] }}>{t('kyc.additionalNotes', 'Additional notes')}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder={t('kyc.notesPlaceholder', 'Anything the admin should know?')}
          style={[styles.textArea, { borderColor: colors.border.primary, color: colors.text.primary }]}
        />
      </View>
      {requireWhatsapp ? (
        <View>
          <Text style={{ marginBottom: spacing['spacer8'] }}>מספר WhatsApp לבדיקת וידאו</Text>
          <TextInput
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            keyboardType="phone-pad"
            placeholder="050-000-0000"
            style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary }]}
          />
        </View>
      ) : null}
    </Stack>
  );
}

function artifactLabel(type: string): string {
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
      return 'צילום מסך רשת חברתית';
    case 'whatsapp-call':
      return 'רשומת שיחת WhatsApp';
    default:
      return type;
  }
}

const styles = StyleSheet.create({
  page: { paddingVertical: spacing['spacer24'] },
  statusCard: { padding: spacing['spacer16'], borderRadius: radius.lg },
  statusLabel: { fontWeight: '600' },
  stepper: { gap: spacing['spacer12'] },
  stepItem: { gap: spacing['spacer8'] },
  stepDescription: { fontSize: 14 },
  stepButton: { marginBottom: spacing['spacer4'] },
  stepButtonActive: { opacity: 1 },
  stepButtonComplete: { opacity: 0.8 },
  stepButtonText: { fontWeight: '600' },
  stepCard: { padding: spacing['spacer16'], borderRadius: radius.lg },
  reviewCard: { padding: spacing['spacer16'], borderRadius: radius.lg, gap: spacing['spacer16'] },
  previewImage: { width: '100%', height: 220, borderRadius: radius.md, backgroundColor: '#000' },
  artifactCard: { padding: spacing['spacer12'], borderRadius: radius.md },
  hashText: { fontSize: 12, fontFamily: 'Courier', color: '#555' },
  textArea: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing['spacer12'],
    minHeight: 100,
    textAlignVertical: 'top',
  },
  input: { borderWidth: 1, borderRadius: radius.md, padding: spacing['spacer12'] },
  errorText: { fontWeight: '600' },
  successText: { fontWeight: '600' },
});

