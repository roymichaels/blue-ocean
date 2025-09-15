import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Portal, Overlay, Text } from '@/ui';
import { useTheme } from '@/ui/ThemeProvider';
import { spacing, radius, typography } from '@/ui/tokens';
import { useWaku } from '@/contexts/WakuContext';
import { useWallet } from '@/contexts/WalletProvider';
import { useQueryClient } from '@tanstack/react-query';
import useReducedMotion from '@/shared/hooks/useReducedMotion';
import { getChain, getNetworkId, getTransport } from '@/services/config';
import { registry } from '@/services/monitoring';
import type { RegistrySnapshot } from '@/utils/localMetrics';

interface GadgetLabConsoleProps {
  visible: boolean;
  onClose: () => void;
}

interface DiagnosticsState {
  lastSync: number | null;
  totalQueries: number;
  inflightQueries: number;
  metrics: RegistrySnapshot | null;
  capturedAt: number;
}

interface MetricRow {
  label: string;
  value: string;
  detail?: string;
}

function formatRelative(timestamp: number | null): string {
  if (!timestamp) return '—';
  const diff = Date.now() - timestamp;
  if (diff < 0) return 'just now';
  if (diff < 1000) return 'just now';
  const seconds = Math.round(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return '';
  }
}

function formatAddress(address: string | null): string {
  if (!address) return 'Not connected';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function GadgetLabConsole({ visible, onClose }: GadgetLabConsoleProps) {
  const { colors } = useTheme();
  const { status } = useWaku();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [shouldRender, setShouldRender] = useState(visible);
  const fade = useRef(new Animated.Value(0)).current;
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    lastSync: null,
    totalQueries: 0,
    inflightQueries: 0,
    metrics: null,
    capturedAt: Date.now(),
  });

  useEffect(() => {
    if (status === 'connected') {
      setConnectedAt(Date.now());
    } else if (status === 'disconnected') {
      setConnectedAt(null);
    }
  }, [status]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!shouldRender) return;
    if (reduceMotion) {
      fade.setValue(visible ? 1 : 0);
      if (!visible) {
        setShouldRender(false);
      }
      return;
    }
    const animation = Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: visible ? 180 : 120,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!visible && finished) {
        setShouldRender(false);
      }
    });
    return () => {
      animation.stop();
    };
  }, [fade, reduceMotion, shouldRender, visible]);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    const update = () => {
      const queries = queryClient.getQueryCache().getAll();
      let lastUpdated = 0;
      let inflight = 0;
      for (const query of queries) {
        const { dataUpdatedAt, fetchStatus } = query.state;
        if (dataUpdatedAt && dataUpdatedAt > lastUpdated) {
          lastUpdated = dataUpdatedAt;
        }
        if (fetchStatus === 'fetching') {
          inflight += 1;
        }
      }
      const snapshot = registry.snapshot();
      if (mounted) {
        setDiagnostics({
          lastSync: lastUpdated || null,
          totalQueries: queries.length,
          inflightQueries: inflight,
          metrics: snapshot,
          capturedAt: Date.now(),
        });
      }
    };
    update();
    const interval = setInterval(update, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [queryClient, visible]);

  const networkId = useMemo(() => getNetworkId() || 'unknown', []);
  const chain = useMemo(() => getChain(), []);
  const transport = useMemo(() => getTransport(), []);

  const connectivityRows = useMemo<MetricRow[]>(() => {
    const statusLabel =
      status === 'connected'
        ? 'Connected'
        : status === 'connecting'
          ? 'Connecting'
          : 'Disconnected';
    const statusDetail = status === 'connected' ? formatRelative(connectedAt) : undefined;
    return [
      { label: 'Transport', value: transport.toUpperCase() },
      { label: 'Network', value: String(networkId).toUpperCase() },
      { label: 'Chain', value: chain.toUpperCase() },
      {
        label: 'Wallet',
        value: formatAddress(address),
        detail: address ? 'Active session' : undefined,
      },
      {
        label: 'Waku',
        value: statusLabel,
        detail: statusDetail === '—' ? undefined : statusDetail,
      },
    ];
  }, [address, chain, connectedAt, networkId, status, transport]);

  const healthMetrics = useMemo<MetricRow[]>(() => {
    const rows: MetricRow[] = [];
    const snapshot = diagnostics.metrics;
    rows.push({
      label: 'Query load',
      value: `${diagnostics.inflightQueries}/${diagnostics.totalQueries}`,
      detail: diagnostics.inflightQueries ? 'In flight' : 'Idle',
    });
    if (!snapshot) {
      return rows;
    }
    const cacheHit = snapshot.gauges['cache_hit_ratio'];
    if (cacheHit && cacheHit.length) {
      const avg = cacheHit.reduce((sum, entry) => sum + entry.value, 0) / cacheHit.length;
      rows.push({
        label: 'Cache hit ratio',
        value: `${Math.round(avg * 100)}%`,
        detail: `${cacheHit.length} caches`,
      });
    }
    const hydration = snapshot.histograms['cache_hydration_ms'];
    if (hydration && hydration.length) {
      const last = hydration.reduce((max, entry) => Math.max(max, entry.last), 0);
      const avg = hydration.reduce((sum, entry) => sum + entry.avg, 0) / hydration.length;
      rows.push({
        label: 'Hydration time',
        value: `${Math.round(last)} ms`,
        detail: `avg ${Math.round(avg)} ms`,
      });
    }
    const latency = snapshot.histograms['service_latency_ms'];
    if (latency && latency.length) {
      const avg = latency.reduce((sum, entry) => sum + entry.avg, 0) / latency.length;
      rows.push({
        label: 'Service latency',
        value: `${Math.round(avg)} ms`,
        detail: `${latency.reduce((sum, entry) => sum + entry.count, 0)} samples`,
      });
    }
    const failures = snapshot.counters['service_failures_total'];
    if (failures && failures.length) {
      const total = failures.reduce((sum, entry) => sum + entry.value, 0);
      rows.push({ label: 'Service failures', value: `${total}`, detail: 'Since launch' });
    }
    return rows;
  }, [diagnostics]);

  const lastSyncRelative = formatRelative(diagnostics.lastSync);
  const lastSyncExact = formatTimestamp(diagnostics.lastSync);

  if (!shouldRender) return null;

  return (
    <Portal>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="box-none">
        <Pressable
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close Gadget Lab Console"
        >
          <Overlay style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.55)' }]} />
        </Pressable>
        <View style={styles.center} pointerEvents="box-none">
          <View style={[styles.container, { backgroundColor: colors.surface.elevated }]}>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.title, { color: colors.text.primary }]}>Gadget Lab Console</Text>
                <Text style={[styles.caption, { color: colors.text.tertiary }]}>Premium diagnostics overlay</Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close Gadget Lab Console"
                style={styles.closeButton}
              >
                <Text style={[styles.closeText, { color: colors.text.secondary }]}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Connectivity</Text>
              {connectivityRows.map((row) => (
                <View key={row.label} style={styles.metricRow}>
                  <Text style={[styles.metricLabel, { color: colors.text.tertiary }]}>{row.label}</Text>
                  <View style={styles.metricValueGroup}>
                    <Text style={[styles.metricValue, { color: colors.text.primary }]}>{row.value}</Text>
                    {row.detail ? (
                      <Text style={[styles.metricDetail, { color: colors.text.tertiary }]}>{row.detail}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Last sync</Text>
              <View style={styles.metricRow}>
                <Text style={[styles.metricLabel, { color: colors.text.tertiary }]}>Data freshness</Text>
                <View style={styles.metricValueGroup}>
                  <Text style={[styles.metricValue, { color: colors.text.primary }]}>{lastSyncRelative}</Text>
                  {lastSyncExact ? (
                    <Text style={[styles.metricDetail, { color: colors.text.tertiary }]}>at {lastSyncExact}</Text>
                  ) : null}
                </View>
              </View>
              <Text style={[styles.metricHint, { color: colors.text.tertiary }]}>Snapshot {formatRelative(diagnostics.capturedAt)}</Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Health metrics</Text>
              {healthMetrics.map((row) => (
                <View key={row.label} style={styles.metricRow}>
                  <Text style={[styles.metricLabel, { color: colors.text.tertiary }]}>{row.label}</Text>
                  <View style={styles.metricValueGroup}>
                    <Text style={[styles.metricValue, { color: colors.text.primary }]}>{row.value}</Text>
                    {row.detail ? (
                      <Text style={[styles.metricDetail, { color: colors.text.tertiary }]}>{row.detail}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
              {healthMetrics.length === 0 ? (
                <Text style={[styles.metricHint, { color: colors.text.tertiary }]}>Metrics activate as agents process activity.</Text>
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spacer24,
  },
  container: {
    width: '100%',
    maxWidth: 520,
    borderRadius: radius.xl,
    paddingVertical: spacing.spacer24,
    paddingHorizontal: spacing.spacer24,
    gap: spacing.spacer24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.spacer16,
  },
  title: {
    ...typography['2xl'],
    fontWeight: '700',
  },
  caption: {
    ...typography.sm,
    marginTop: spacing.spacer4,
  },
  closeButton: {
    paddingVertical: spacing.spacer4,
    paddingHorizontal: spacing.spacer8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  closeText: {
    ...typography.sm,
  },
  section: {
    gap: spacing.spacer12,
  },
  sectionTitle: {
    ...typography.md,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.spacer12,
  },
  metricLabel: {
    ...typography.sm,
    flexShrink: 0,
    minWidth: 120,
  },
  metricValueGroup: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metricValue: {
    ...typography.md,
    fontWeight: '600',
  },
  metricDetail: {
    ...typography.xs,
    marginTop: 2,
  },
  metricHint: {
    ...typography.xs,
  },
});
