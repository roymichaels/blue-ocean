import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppRouter } from '@/hooks';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { Heading, Text, Button, Card, TextField, Badge, Spinner } from '@/ui/primitives';
import storesAgent from '@/agents/stores-agent';
import DatabaseService from '@/services/database';
import { useNotificationActions } from '@/components/NotificationContext';
import {
  createStoreOnChain,
  createDefaultStoreServiceDeps,
} from '@/features/stores/services/nearStores';
import { useWallet } from '@/contexts/WalletProvider';
import { errorLog } from '@/utils/logger';
import { radius, spacing } from '@/shared/ui/tokens';

const storeServiceDeps = createDefaultStoreServiceDeps();

const identitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'stores.wizard.nameRequired'),
  owner: z
    .string()
    .trim()
    .min(1, 'stores.wizard.ownerRequired'),
});

type WizardStep = 'identity' | 'confirmation' | 'success';

export type StoreIdentityForm = z.infer<typeof identitySchema>;

export interface MintProgressState {
  status: 'idle' | 'preparing' | 'submitting' | 'finalizing' | 'success' | 'error';
  txHash?: string;
  message?: string;
  fallback?: boolean;
}

export interface MintResult {
  storeId: string;
  storeName: string;
  owner: string;
  txHash?: string;
  fallback?: boolean;
}

interface StoreCreationContentProps {
  owner: string | null;
  onConnectWallet: () => Promise<void>;
  onMint: (
    values: StoreIdentityForm,
    updateProgress: (state: MintProgressState) => void,
  ) => Promise<MintResult>;
  onViewAdmin: (storeId: string) => void;
  initialStep?: WizardStep;
  initialValues?: Partial<StoreIdentityForm>;
  initialMintResult?: MintResult | null;
}

export function StoreCreationContent({
  owner,
  onConnectWallet,
  onMint,
  onViewAdmin,
  initialStep = 'identity',
  initialValues,
  initialMintResult = null,
}: StoreCreationContentProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [mintResult, setMintResult] = useState<MintResult | null>(initialMintResult);
  const [progress, setProgress] = useState<MintProgressState>({ status: 'idle' });
  const [isMinting, setIsMinting] = useState(false);

  const translateWithFallback = useCallback(
    (key: string, fallback: string, params?: Record<string, string | number>) => {
      const value = params ? t(key, params) : t(key, fallback);
      if (!value || value === key) {
        return fallback;
      }
      return value;
    },
    [t],
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, dirtyFields },
    setValue,
    watch,
  } = useForm<StoreIdentityForm>({
    resolver: zodResolver(identitySchema),
    mode: 'onChange',
    defaultValues: {
      name: initialValues?.name ?? '',
      owner: initialValues?.owner ?? owner ?? '',
    },
  });

  const nameValue = watch('name');
  const ownerValue = watch('owner');

  useEffect(() => {
    if (owner !== null && !dirtyFields.owner) {
      setValue('owner', owner);
    }
  }, [owner, dirtyFields.owner, setValue]);

  const stepIndex = useMemo(() => {
    const order: WizardStep[] = ['identity', 'confirmation', 'success'];
    return order.indexOf(step);
  }, [step]);

  const progressMessage = useMemo(() => {
    switch (progress.status) {
      case 'preparing':
        return translateWithFallback(
          'stores.wizard.progressPreparing',
          'Preparing transaction...',
        );
      case 'submitting':
        return translateWithFallback(
          'stores.wizard.progressSubmitting',
          'Submitting to NEAR…',
        );
      case 'finalizing':
        return progress.txHash
          ? translateWithFallback(
              'stores.wizard.progressFinalizingWithTx',
              `Finalizing deployment… (${progress.txHash})`,
              { tx: progress.txHash },
            )
          : translateWithFallback(
              'stores.wizard.progressFinalizing',
              'Finalizing deployment…',
            );
      case 'success':
        return progress.fallback
          ? translateWithFallback(
              'stores.wizard.progressSuccessFallback',
              'Store created locally. Syncing with chain…',
            )
          : translateWithFallback(
              'stores.wizard.progressSuccess',
              'Success! Redirecting to admin…',
            );
      case 'error':
        return (
          progress.message ??
          translateWithFallback('stores.transactionFailed', 'Transaction failed')
        );
      default:
        return null;
    }
  }, [progress, translateWithFallback]);

  const progressColor = useMemo(() => {
    if (progress.status === 'error') {
      return colors.status.error;
    }
    if (progress.status === 'success') {
      return colors.status.success;
    }
    return colors.text.secondary;
  }, [colors.status, colors.text, progress.status]);

  const primaryLabel = useMemo(() => {
    if (step === 'identity') {
      return translateWithFallback('stores.wizard.continueCta', 'Continue');
    }
    if (step === 'confirmation') {
      return translateWithFallback('stores.mintStore', 'Mint Store');
    }
    if (mintResult) {
      return translateWithFallback('stores.wizard.viewAdminCta', 'Open Admin');
    }
    return translateWithFallback('stores.wizard.continueCta', 'Continue');
  }, [mintResult, step, translateWithFallback]);

  const canProceed = step === 'identity' ? isValid && !!ownerValue : true;

  const handlePrimaryAction = useCallback(() => {
    if (step === 'identity') {
      handleSubmit(() => {
        setStep('confirmation');
        setProgress({ status: 'idle' });
      })();
      return;
    }

    if (step === 'confirmation') {
      handleSubmit(async values => {
        setIsMinting(true);
        setProgress({ status: 'preparing' });
        try {
          const result = await onMint(values, update => setProgress(update));
          setMintResult(result);
          setProgress(prev => ({
            status: 'success',
            txHash: prev.txHash ?? result.txHash,
            fallback: result.fallback ?? prev.fallback,
          }));
          setStep('success');
        } catch (err: any) {
          const message =
            err?.message && typeof err.message === 'string'
              ? err.message
              : translateWithFallback('stores.transactionFailed', 'Transaction failed');
          setProgress({ status: 'error', message });
        } finally {
          setIsMinting(false);
        }
      })();
      return;
    }

    if (step === 'success' && mintResult) {
      onViewAdmin(mintResult.storeId);
    }
  }, [handleSubmit, mintResult, onMint, onViewAdmin, step, translateWithFallback]);

  const handleEditDetails = useCallback(() => {
    setStep('identity');
    setProgress({ status: 'idle' });
  }, []);

  const badgeInitial = useMemo(() => {
    const fallback = translateWithFallback('stores.storeName', 'Store Name');
    const value = (nameValue || fallback).trim();
    return value.slice(0, 1).toUpperCase();
  }, [nameValue, translateWithFallback]);

  const renderIdentityStep = () => (
    <View
      style={styles.stepCard}
      testID="store-creation-step-identity"
    >
      <Heading
        size="lg"
        weight="700"
        style={{ color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }}
        testID="store-creation-heading"
      >
        {translateWithFallback('stores.wizard.identityHeading', 'Store identity')}
      </Heading>
      <Text
        variant="sm"
        style={{
          color: colors.text.secondary,
          marginTop: spacing.spacer8,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {translateWithFallback(
          'stores.wizard.identityDescription',
          'Name your storefront and confirm the owner wallet.',
        )}
      </Text>
      <View style={{ marginTop: spacing.spacer16 }}>
        <Text
          variant="sm"
          weight="600"
          style={{ color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }}
        >
          {translateWithFallback('stores.storeName', 'Store Name')}
        </Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextField
              value={value}
              onChangeText={onChange}
              placeholder={translateWithFallback(
                'stores.wizard.namePlaceholder',
                'e.g. Sunrise Collective',
              )}
              textAlign={isRTL ? 'right' : 'left'}
              style={{ marginTop: spacing.spacer8 }}
              autoCapitalize="words"
              testID="store-creation-name"
            />
          )}
        />
        {errors.name ? (
          <Text
            variant="xs"
            style={{
              color: colors.status.error,
              marginTop: spacing.spacer4,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {translateWithFallback(
              errors.name.message ?? 'stores.wizard.nameRequired',
              'Enter a store name',
            )}
          </Text>
        ) : null}
      </View>
      <View style={{ marginTop: spacing.spacer16 }}>
        <Text
          variant="sm"
          weight="600"
          style={{ color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }}
        >
          {translateWithFallback('stores.wizard.ownerLabel', 'Owner wallet')}
        </Text>
        <Controller
          control={control}
          name="owner"
          render={({ field: { value } }) => (
            <TextField
              value={value}
              editable={false}
              placeholder={translateWithFallback(
                'stores.wizard.ownerPlaceholder',
                'Connect wallet to autofill',
              )}
              style={{
                marginTop: spacing.spacer8,
                color: value ? colors.text.primary : colors.text.tertiary,
              }}
              textAlign={isRTL ? 'right' : 'left'}
              testID="store-creation-owner"
            />
          )}
        />
        {errors.owner ? (
          <Text
            variant="xs"
            style={{
              color: colors.status.error,
              marginTop: spacing.spacer4,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {translateWithFallback(
              errors.owner.message ?? 'stores.wizard.ownerRequired',
              'Connect your wallet to continue',
            )}
          </Text>
        ) : null}
        <Button
          title={translateWithFallback('wallet.connect', 'Connect Wallet')}
          onPress={onConnectWallet}
          style={[
            styles.connectButton,
            { marginTop: spacing.spacer12 },
          ]}
          testID="store-creation-connect"
        />
      </View>
    </View>
  );

  const renderConfirmationStep = () => (
    <View style={styles.stepCard} testID="store-creation-step-confirmation">
      <View style={styles.confirmationHeader}>
        <Heading
          size="lg"
          weight="700"
          style={{ color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }}
        >
          {translateWithFallback('stores.wizard.confirmationHeading', 'Review & mint')}
        </Heading>
        <Button
          title={translateWithFallback('stores.wizard.editDetails', 'Edit details')}
          onPress={handleEditDetails}
          style={[
            styles.editButton,
            {
              backgroundColor: colors.surface.primary,
              borderColor: colors.border.primary,
              borderWidth: 1,
            },
          ]}
          textStyle={{ color: colors.text.primary }}
          testID="store-creation-edit"
        />
      </View>
      <Text
        variant="sm"
        style={{
          color: colors.text.secondary,
          marginTop: spacing.spacer8,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {translateWithFallback(
          'stores.wizard.confirmationDescription',
          'Double-check details and preview your badge before minting.',
        )}
      </Text>
      <Card style={{ marginTop: spacing.spacer16 }}>
        <Text
          variant="xs"
          style={{ color: colors.text.secondary, textTransform: 'uppercase' }}
        >
          {translateWithFallback(
            'stores.wizard.badgePreviewLabel',
            'Storefront badge preview',
          )}
        </Text>
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            marginTop: spacing.spacer12,
            gap: spacing.spacer16,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.full,
              backgroundColor: colors.surface.secondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heading size="lg" weight="700" style={{ color: colors.text.primary }}>
              {badgeInitial}
            </Heading>
          </View>
          <View style={{ flex: 1 }}>
            <Heading
              size="lg"
              style={{ color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }}
            >
              {nameValue.trim() || translateWithFallback('stores.storeName', 'Store Name')}
            </Heading>
            <Text
              variant="sm"
              style={{
                color: colors.text.secondary,
                marginTop: spacing.spacer4,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {ownerValue
                ? translateWithFallback(
                    'stores.wizard.ownerSummary',
                    `Owner: ${ownerValue}`,
                    { owner: ownerValue },
                  )
                : translateWithFallback(
                    'stores.wizard.ownerPlaceholder',
                    'Connect wallet to autofill',
                  )}
            </Text>
          </View>
          <Badge
            label={translateWithFallback('stores.wizard.badgeLabel', 'Mint ready')}
          />
        </View>
      </Card>
      <Card style={{ marginTop: spacing.spacer16 }}>
        <Heading size="md" weight="600" style={{ color: colors.text.primary }}>
          {translateWithFallback('stores.wizard.identitySummary', 'Identity summary')}
        </Heading>
        <View style={{ marginTop: spacing.spacer12, gap: spacing.spacer8 }}>
          <View>
            <Text variant="xs" style={{ color: colors.text.secondary }}>
              {translateWithFallback('stores.storeName', 'Store Name')}
            </Text>
            <Text variant="md" style={{ color: colors.text.primary }}>
              {nameValue.trim() || translateWithFallback('stores.storeName', 'Store Name')}
            </Text>
          </View>
          <View>
            <Text variant="xs" style={{ color: colors.text.secondary }}>
              {translateWithFallback('stores.wizard.ownerLabel', 'Owner wallet')}
            </Text>
            <Text variant="md" style={{ color: colors.text.primary }}>
              {ownerValue}
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepCard} testID="store-creation-step-success">
      <Heading
        size="lg"
        weight="700"
        style={{ color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }}
      >
        {translateWithFallback('stores.wizard.successHeading', 'Store minted')}
      </Heading>
      <Text
        variant="sm"
        style={{
          color: colors.text.secondary,
          marginTop: spacing.spacer8,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {translateWithFallback(
          'stores.wizard.successDescription',
          'Your storefront badge is live. Continue to admin tools to add products.',
        )}
      </Text>
      {mintResult ? (
        <Card style={{ marginTop: spacing.spacer16 }}>
          <Text variant="xs" style={{ color: colors.text.secondary }}>
            {translateWithFallback('stores.wizard.successNameLabel', 'Storefront')}
          </Text>
          <Heading size="lg" style={{ color: colors.text.primary }}>
            {mintResult.storeName}
          </Heading>
          <Text variant="sm" style={{ color: colors.text.secondary, marginTop: spacing.spacer8 }}>
            {translateWithFallback(
              'stores.wizard.successOwnerLabel',
              `Owner: ${mintResult.owner}`,
              { owner: mintResult.owner },
            )}
          </Text>
          {mintResult.txHash ? (
            <Text
              variant="xs"
              style={{ color: colors.text.secondary, marginTop: spacing.spacer8 }}
            >
              {translateWithFallback(
                'stores.wizard.successTxLabel',
                `Transaction hash: ${mintResult.txHash}`,
                { tx: mintResult.txHash },
              )}
            </Text>
          ) : null}
          {mintResult.fallback ? (
            <Text
              variant="xs"
              style={{ color: colors.status.warning, marginTop: spacing.spacer8 }}
            >
              {translateWithFallback(
                'stores.wizard.successFallback',
                'Local mint complete. The chain transaction will sync when available.',
              )}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.canvas }]}
      testID="store-creation-root"
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: spacing.spacer40 * 2,
            alignItems: 'stretch',
          },
        ]}
        alwaysBounceVertical={false}
      >
        <Text
          variant="xs"
          style={{
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {translateWithFallback(
            'stores.wizard.progressLabel',
            `Step ${stepIndex + 1} of 3`,
            { step: stepIndex + 1 },
          )}
        </Text>
        <Heading
          size="xl"
          weight="700"
          style={{
            color: colors.text.primary,
            marginTop: spacing.spacer8,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {translateWithFallback('stores.wizard.title', 'Mint your store')}
        </Heading>
        <Text
          variant="md"
          style={{
            color: colors.text.secondary,
            marginTop: spacing.spacer8,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {translateWithFallback(
            'stores.wizard.subtitle',
            'Create a badge-ready storefront with Shopify-quality polish.',
          )}
        </Text>
        <Card style={{ marginTop: spacing.spacer24 }}>
          {step === 'identity'
            ? renderIdentityStep()
            : step === 'confirmation'
              ? renderConfirmationStep()
              : renderSuccessStep()}
        </Card>
      </ScrollView>
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.canvas,
            borderTopColor: colors.border.primary,
          },
        ]}
      >
        {progressMessage ? (
          <View style={styles.progressRow}>
            {isMinting ? <Spinner size="small" color={progressColor} /> : null}
            <Text
              variant="sm"
              style={{ color: progressColor, marginStart: spacing.spacer8 }}
              testID="store-creation-progress"
            >
              {progressMessage}
            </Text>
          </View>
        ) : null}
        <Button
          title={primaryLabel}
          onPress={handlePrimaryAction}
          disabled={(step === 'identity' && !canProceed) || (step === 'confirmation' && isMinting)}
          loading={isMinting && step === 'confirmation'}
          style={styles.primaryButton}
          testID="store-creation-primary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.spacer24,
    paddingTop: spacing.spacer24,
    gap: spacing.spacer16,
  },
  stepCard: {
    gap: spacing.spacer12,
  },
  footer: {
    paddingHorizontal: spacing.spacer24,
    paddingVertical: spacing.spacer16,
    borderTopWidth: 1,
  },
  primaryButton: {
    width: '100%',
  },
  connectButton: {
    width: '100%',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.spacer12,
  },
  confirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.spacer12,
  },
  editButton: {
    minWidth: 120,
  },
});

const StoreCreation: React.FC = () => {
  const { replace } = useAppRouter();
  const { t } = useLanguage();
  const { showNotification } = useNotificationActions();
  const { address: owner, connect } = useWallet();

  const handleMint = useCallback(
    async (
      values: StoreIdentityForm,
      updateProgress: (state: MintProgressState) => void,
    ): Promise<MintResult> => {
      const ownerAccount = values.owner.trim();
      const rawName = values.name.trim();
      const fallbackName = rawName || `Store ${ownerAccount.slice(0, 6)} ${Date.now()
        .toString()
        .slice(-4)}`.trim();
      const id = Date.now().toString();
      let txHash: string | undefined;
      let onChainError: any = null;

      updateProgress({ status: 'submitting' });

      try {
        txHash = await createStoreOnChain(
          { id, name: fallbackName, owner: ownerAccount },
          storeServiceDeps,
        );
        if (txHash) {
          updateProgress({ status: 'finalizing', txHash });
          try {
            showNotification('Store Minted', `tx: ${txHash}`, 'success');
          } catch {}
        } else {
          updateProgress({ status: 'finalizing' });
        }
      } catch (err: any) {
        onChainError = err;
        errorLog('mint', 'shop', 'fail', err);
        updateProgress({ status: 'finalizing' });
      }

      try {
        await storesAgent.add({
          id,
          name: fallbackName,
          owner: ownerAccount,
          nftId: id,
          plan: 'free',
        });

        try {
          await DatabaseService.getInstance().updateUserRole(ownerAccount, 'store-owner');
        } catch {}

        updateProgress({
          status: 'success',
          txHash,
          fallback: Boolean(onChainError),
        });

        return {
          storeId: id,
          storeName: fallbackName,
          owner: ownerAccount,
          txHash,
          fallback: Boolean(onChainError),
        };
      } catch (err: any) {
        errorLog('mint', 'shop', 'fail', err);
        throw new Error(t('stores.transactionCancelled', 'Transaction cancelled'));
      }
    },
    [showNotification, t],
  );

  return (
    <StoreCreationContent
      owner={owner}
      onConnectWallet={connect}
      onMint={handleMint}
      onViewAdmin={storeId => replace(`/store/${storeId}/admin`)}
    />
  );
};

export default StoreCreation;

