import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Heading, Text, Button, Spinner } from '@/ui/primitives';
import { Stack } from '@/ui/layout';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { spacing, radius } from '@/ui/tokens';
import meteredBilling, { useBillingSummary } from '@/billing';
import { useLaunchGate } from '@/features/launchGate';

interface FeeDashboardProps {
  tenantId: string | null;
  usagePreviewLimit?: number;
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '0.000';
  return value.toFixed(3);
}

function formatAlias(alias: string | null): string {
  if (!alias) return '—';
  if (alias.length <= 12) return alias;
  return `${alias.slice(0, 6)}…${alias.slice(-4)}`;
}

function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace('T', ' ').slice(0, 16);
}

export default function FeeDashboard({ tenantId, usagePreviewLimit = 4 }: FeeDashboardProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { ready: launchReady, pinSet, requireUnlock } = useLaunchGate();
  const [authorized, setAuthorized] = useState(false);
  const [authRequested, setAuthRequested] = useState(false);
  const effectiveTenant = authorized ? tenantId : null;
  const { data, error, isLoading, isFetching, refetch } = useBillingSummary(effectiveTenant);
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const outstanding = data?.outstanding ?? 0;
  const usagePreview = useMemo(() => {
    const items = data?.usage ?? [];
    return items.slice(0, usagePreviewLimit);
  }, [data?.usage, usagePreviewLimit]);

  const unsettledCount = useMemo(() => {
    return (data?.usage ?? []).filter((event) => !event.settledAt).length;
  }, [data?.usage]);

  const handleSettle = useCallback(async () => {
    if (!tenantId || settling || outstanding <= 0) return;
    setSettleError(null);
    try {
      setSettling(true);
      await requireUnlock('billing.viewFees');
      await meteredBilling.settleUsage(tenantId);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to settle balance';
      setSettleError(message);
    } finally {
      setSettling(false);
    }
  }, [tenantId, outstanding, settling, refetch, requireUnlock]);

  useEffect(() => {
    if (!launchReady) return;
    if (!tenantId || !pinSet) {
      setAuthorized(false);
      return;
    }
    let active = true;
    setAuthRequested(true);
    requireUnlock('billing.viewFees')
      .then(() => {
        if (active) setAuthorized(true);
      })
      .catch(() => {
        if (active) setAuthorized(false);
      });
    return () => {
      active = false;
      setAuthorized(false);
    };
  }, [launchReady, pinSet, tenantId, requireUnlock]);

  if (!tenantId) {
    return null;
  }

  if (!authorized) {
    return (
      <Card style={styles.card}>
        <Stack gap="spacer16" align="center">
          <Heading size="md" style={{ color: colors.text.primary }}>
            {t('billing.title', 'Network fees & usage')}
          </Heading>
          <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
            {t(
              'billing.unlockPrompt',
              'Unlock with your PIN to view fee settings.',
            )}
          </Text>
          <Button
            onPress={() => {
              void requireUnlock('billing.viewFees').then(() => setAuthorized(true));
            }}
            loading={!authRequested || !launchReady}
          >
            {t('billing.unlockAction', 'Unlock')}
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Stack gap="spacer16">
        <Stack direction="horizontal" align="center" style={styles.header}>
          <Heading size="md">
            {t('billing.title', 'Network fees & usage')}
          </Heading>
          <View style={styles.headerActions}>
            <Button
              onPress={() => void refetch()}
              disabled={isFetching || settling}
              loading={isFetching && !isLoading}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.surface.secondary,
                  borderColor: colors.border.primary,
                },
              ]}
              textStyle={{ color: colors.text.primary }}
            >
              {t('common.refresh', 'Refresh')}
            </Button>
            <Button
              onPress={handleSettle}
              disabled={settling || outstanding <= 0}
              loading={settling}
              tooltip={
                outstanding > 0
                  ? t('billing.settleTooltip', 'Sign with your wallet to clear fees')
                  : t('billing.settleDisabled', 'No outstanding fees')
              }
            >
              {t('billing.settleCta', 'Settle balance')}
            </Button>
          </View>
        </Stack>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <Spinner />
          </View>
        ) : (
          <Stack gap="spacer12">
            <View style={styles.metricsRow}>
              <View style={[styles.metricBox, { borderColor: colors.border.primary }]}>
                <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>
                  {t('billing.totalVolume', 'Billed volume')}
                </Text>
                <Text style={[styles.metricValue, { color: colors.text.primary }]}>
                  {formatAmount(data?.totalUsage ?? 0)} NEAR
                </Text>
              </View>
              <View style={[styles.metricBox, { borderColor: colors.border.primary }]}>
                <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>
                  {t('billing.totalFees', 'Accrued fees')}
                </Text>
                <Text style={[styles.metricValue, { color: colors.text.primary }]}>
                  {formatAmount(data?.totalFees ?? 0)} NEAR
                </Text>
              </View>
              <View
                style={[
                  styles.metricBox,
                  styles.outstanding,
                  {
                    borderColor: colors.border.focus,
                    backgroundColor: colors.surface.secondary,
                  },
                ]}
              >
                <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>
                  {t('billing.outstanding', 'Outstanding')}
                </Text>
                <Text style={[styles.metricValue, { color: colors.text.primary }]}>
                  {formatAmount(outstanding)} NEAR
                </Text>
                <Text style={[styles.metricMeta, { color: colors.text.secondary }]}>
                  {`${t('billing.unsettledCount', 'Unsettled records')}: ${unsettledCount}`}
                </Text>
              </View>
            </View>

            {error && (
              <Text style={[styles.errorText, { color: colors.status.error }]}>
                {error.message}
              </Text>
            )}
            {settleError && (
              <Text style={[styles.errorText, { color: colors.status.error }]}>
                {settleError}
              </Text>
            )}

            <Stack gap="spacer8">
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
                {t('billing.recentActivity', 'Recent usage')}
              </Text>
              {usagePreview.length === 0 ? (
                <Text style={{ color: colors.text.secondary }}>
                  {t('billing.noUsage', 'No billable activity yet.')}
                </Text>
              ) : (
                usagePreview.map((event) => {
                  const settled = Boolean(event.settledAt);
                  return (
                    <View
                      key={event.id}
                      style={[
                        styles.usageRow,
                        { borderColor: colors.border.secondary },
                        settled && styles.settledRow,
                      ]}
                    >
                      <Stack gap="spacer4" style={{ flex: 1 }}>
                        <Text style={[styles.usageTitle, { color: colors.text.primary }]}>
                          {event.meterId}
                        </Text>
                        <Text style={{ color: colors.text.secondary }}>
                          {t('billing.orderReference', 'Reference')}: {event.metadata?.orderId ?? event.id}
                        </Text>
                      </Stack>
                      <Stack gap="spacer4" style={styles.usageDetails}>
                        <Text style={[styles.usageAmount, { color: colors.text.primary }]}>
                          {formatAmount(event.fee)} NEAR
                        </Text>
                        <Text style={{ color: colors.text.secondary, textAlign: 'right' }}>
                          {settled
                            ? `${t('billing.settledAt', 'Settled at')}: ${formatTimestamp(event.settledAt)}`
                            : `${t('billing.recordedAt', 'Recorded')}: ${formatTimestamp(event.recordedAt)}`}
                        </Text>
                      </Stack>
                    </View>
                  );
                })
              )}
            </Stack>

            <View style={[styles.noticeBox, { borderColor: colors.border.secondary }]}>
              <Text style={{ color: colors.text.secondary }}>
                {t(
                  'billing.pseudonymousNotice',
                  'Wallet aliases are hashed per tenant. Raw addresses never leave your device.'
                )}
              </Text>
              <Text style={{ color: colors.text.secondary }}>
                {t('billing.activeAlias', 'Active alias')}: {formatAlias(data?.walletAlias ?? null)}
              </Text>
            </View>

            {data?.lastPayment && (
              <View style={[styles.noticeBox, { borderColor: colors.border.secondary }]}>
                <Text style={{ color: colors.text.secondary }}>
                  {t('billing.lastPayment', 'Last payment')}: {formatTimestamp(data.lastPayment.recordedAt)}
                </Text>
                <Text style={{ color: colors.text.secondary }}>
                  {t('billing.lastPaymentAmount', 'Amount')}: {formatAmount(data.lastPayment.amount)} NEAR
                </Text>
              </View>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.spacer16,
  },
  header: {
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.spacer8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  loadingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.spacer16,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spacer16,
  },
  metricBox: {
    minWidth: 140,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.spacer12,
    gap: spacing.spacer4,
  },
  outstanding: {
    minWidth: 160,
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.9,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  metricMeta: {
    fontSize: 12,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  usageRow: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.spacer12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.spacer12,
  },
  settledRow: {
    opacity: 0.7,
  },
  usageTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  usageAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  usageDetails: {
    alignItems: 'flex-end',
  },
  noticeBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.spacer12,
    gap: spacing.spacer4,
  },
  errorText: {
    fontSize: 13,
  },
});
