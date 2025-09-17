import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Button, Portal, Spinner, Text } from '@/ui';
import { useTheme } from '@/ui/ThemeProvider';
import { radius, spacing, typography } from '@/ui/tokens';
import useReducedMotion from '@/shared/hooks/useReducedMotion';
import { snapshotObservabilityMetrics } from '@/utils/observability';
import { registry as monitoringRegistry } from '@/services/monitoring';
import type { RegistrySnapshot } from '@/utils/localMetrics';
import { snapshot as snapshotQueue } from '@/utils/wakuStore';
import { useWaku } from '@/contexts/WakuContext';
import { useAuth } from '@/features/auth/AuthContext';
import { getSession } from '@/services/session';
import { useLaunchGate } from '@/features/launchGate';
import * as FileSystem from 'expo-file-system';

const DRAWER_WIDTH = 320;

interface OpsDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface OpsSnapshot {
  capturedAt: number;
  waku: {
    status: 'connecting' | 'connected' | 'disconnected';
    peers: number;
    connections: number;
    queueDepth: number;
    decryptErrors: number | null;
  };
  metrics: {
    notificationsBacklog: number | null;
    deliveryBacklog: number | null;
    cacheLagMs: number | null;
  };
  session: {
    token: string | null;
    scopes: string[];
  };
  security: {
    pinSet: boolean;
    biometricAvailable: boolean;
    biometricEnabled: boolean;
  };
  registries: {
    observability: RegistrySnapshot;
    monitoring: RegistrySnapshot;
  };
}

interface GaugeEntry {
  value: number;
}

function readGauge(snapshot: RegistrySnapshot, name: string): number | null {
  const entries = snapshot.gauges[name] as GaugeEntry[] | undefined;
  if (!entries || entries.length === 0) return null;
  return entries.reduce((max, entry) => Math.max(max, entry.value), Number.NEGATIVE_INFINITY);
}

function readCounter(snapshot: RegistrySnapshot, name: string): number | null {
  const entries = snapshot.counters[name];
  if (!entries || entries.length === 0) return null;
  return entries.reduce((sum, entry) => sum + (entry?.value ?? 0), 0);
}

function formatNumber(value: number | null, suffix = ''): string {
  if (value === null || Number.isNaN(value)) return '—';
  const formatted = Math.round(value * 10) / 10;
  return suffix ? `${formatted}${suffix}` : String(formatted);
}

type ExpoFsExtras = {
  EncodingType?: { UTF8?: string };
  cacheDirectory?: string;
  documentDirectory?: string;
};

const expoFs = FileSystem as typeof FileSystem & ExpoFsExtras;

async function exportSnapshot(snapshot: OpsSnapshot): Promise<string> {
  const payload = JSON.stringify(snapshot, null, 2);
  const fileName = `ops-status-${new Date(snapshot.capturedAt).toISOString()}.json`;
  if (Platform.OS === 'web') {
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return url;
  }

  if (typeof FileSystem.writeAsStringAsync === 'function') {
    const dir = expoFs.documentDirectory ?? expoFs.cacheDirectory;
    if (!dir) throw new Error('Writable directory unavailable');
    const encoding = expoFs.EncodingType?.UTF8 ?? 'utf8';
    const uri = `${dir}${fileName}`;
    await FileSystem.writeAsStringAsync(uri, payload, { encoding: encoding as any });
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      throw new Error('Failed to verify exported report');
    }
    return uri;
  }

  const fs = await import('fs/promises');
  const os = await import('os');
  const pathMod = await import('path');
  const filePath = pathMod.join(os.tmpdir(), fileName);
  await fs.writeFile(filePath, payload, 'utf8');
  return `file://${filePath}`;
}

function MetricRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueContainer}>
        <Text style={styles.metricValue}>{value}</Text>
        {detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function OpsDrawer({ open, onClose }: OpsDrawerProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const { status, getPeerSummary } = useWaku();
  const { sessionToken } = useAuth();
  const {
    pinSet,
    biometricAvailable,
    biometricEnabled,
    enableBiometric,
  } = useLaunchGate();

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [shouldRender, setShouldRender] = useState(open);
  const [snapshot, setSnapshot] = useState<OpsSnapshot | null>(null);
  const [exporting, setExporting] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
    }
  }, [open]);

  useEffect(() => {
    if (!shouldRender) return;
    if (reduceMotion) {
      overlayOpacity.setValue(open ? 1 : 0);
      translateX.setValue(open ? 0 : -DRAWER_WIDTH);
      if (!open) {
        setShouldRender(false);
      }
      return;
    }
    const overlayAnim = Animated.timing(overlayOpacity, {
      toValue: open ? 1 : 0,
      duration: open ? 180 : 120,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    const slideAnim = Animated.timing(translateX, {
      toValue: open ? 0 : -DRAWER_WIDTH,
      duration: open ? 220 : 160,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    overlayAnim.start();
    slideAnim.start(({ finished }) => {
      if (!open && finished) {
        setShouldRender(false);
      }
    });
    return () => {
      overlayAnim.stop();
      slideAnim.stop();
    };
  }, [open, reduceMotion, overlayOpacity, translateX, shouldRender]);

  const loadSnapshot = useCallback((): OpsSnapshot => {
    const observability = snapshotObservabilityMetrics();
    const monitoring = monitoringRegistry.snapshot();
    const { peers, connections } = getPeerSummary();
    const queueDepth = snapshotQueue().length;
    const decryptErrors = readCounter(monitoring, 'waku_decrypt_errors_total');
    const notificationsBacklog = readGauge(observability, 'notifications_backlog');
    const deliveryBacklog = readGauge(observability, 'delivery_notifications_backlog');
    const cacheLagMs = readGauge(monitoring, 'cache_sync_lag_ms');
    const record = sessionToken ? getSession(sessionToken) : undefined;
    const scopes = Array.isArray(record?.scopes) ? record!.scopes : [];
    return {
      capturedAt: Date.now(),
      waku: { status, peers, connections, queueDepth, decryptErrors },
      metrics: {
        notificationsBacklog,
        deliveryBacklog,
        cacheLagMs,
      },
      session: {
        token: sessionToken ?? null,
        scopes,
      },
      security: {
        pinSet,
        biometricAvailable,
        biometricEnabled,
      },
      registries: {
        observability,
        monitoring,
      },
    };
  }, [
    status,
    getPeerSummary,
    sessionToken,
    pinSet,
    biometricAvailable,
    biometricEnabled,
  ]);

  useEffect(() => {
    if (!open) return;
    setSnapshot(loadSnapshot());
  }, [open, loadSnapshot]);

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      const latest = loadSnapshot();
      setSnapshot(latest);
      const uri = await exportSnapshot(latest);
      Alert.alert('Status report saved', Platform.OS === 'web' ? 'Report downloaded.' : uri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to export status report.';
      Alert.alert('Export failed', message);
    } finally {
      setExporting(false);
    }
  }, [loadSnapshot]);

  const handleToggleBiometric = useCallback(
    async (value: boolean) => {
      try {
        setBiometricBusy(true);
        await enableBiometric(value);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                security: { ...current.security, biometricEnabled: value },
              }
            : current,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to update biometric preference.';
        Alert.alert('Biometric update failed', message);
      } finally {
        setBiometricBusy(false);
      }
    },
    [enableBiometric],
  );

  const biometricDisabled = !snapshot?.security.pinSet || !snapshot.security.biometricAvailable || biometricBusy;

  const capturedAt = useMemo(() => {
    if (!snapshot) return '';
    try {
      return new Date(snapshot.capturedAt).toLocaleTimeString();
    } catch {
      return '';
    }
  }, [snapshot]);

  if (!shouldRender) return null;

  return (
    <Portal>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
          pointerEvents={open ? 'auto' : 'none'}
        >
          <Pressable
            onPress={onClose}
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close ops console"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.surface?.elevated ?? colors.canvas,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Ops Console</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Trust diagnostics</Text>
            {capturedAt ? (
              <Text style={[styles.timestamp, { color: colors.text.tertiary }]}>Captured {capturedAt}</Text>
            ) : null}
          </View>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: spacing.spacer20 }]}
          >
            {!snapshot ? (
              <View style={styles.loading}>
                <Spinner />
              </View>
            ) : (
              <>
                <Section title="Connectivity">
                  <MetricRow label="Waku" value={snapshot.waku.status} />
                  <MetricRow
                    label="Peers"
                    value={formatNumber(snapshot.waku.peers)}
                    detail={`Connections ${formatNumber(snapshot.waku.connections)}`}
                  />
                  <MetricRow
                    label="Replay queue"
                    value={formatNumber(snapshot.waku.queueDepth)}
                  />
                  <MetricRow
                    label="Decrypt errors"
                    value={formatNumber(snapshot.waku.decryptErrors)}
                  />
                </Section>
                <Section title="Sync">
                  <MetricRow
                    label="Cache lag"
                    value={`${formatNumber(snapshot.metrics.cacheLagMs, ' ms')}`}
                  />
                </Section>
                <Section title="Backlog">
                  <MetricRow
                    label="Notifications"
                    value={formatNumber(snapshot.metrics.notificationsBacklog)}
                  />
                  <MetricRow
                    label="Deliveries"
                    value={formatNumber(snapshot.metrics.deliveryBacklog)}
                  />
                </Section>
                <Section title="Token scopes">
                  {snapshot.session.scopes.length ? (
                    <View style={styles.scopeList}>
                      {snapshot.session.scopes.map((scope) => (
                        <View key={scope} style={[styles.scopePill, { backgroundColor: colors.surface?.muted ?? 'rgba(0,0,0,0.05)' }]}>
                          <Text style={[styles.scopeText, { color: colors.text.primary }]}>{scope}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.emptyScopes, { color: colors.text.secondary }]}>No active scopes</Text>
                  )}
                </Section>
                <Section title="Security">
                  <MetricRow label="PIN enrolled" value={snapshot.security.pinSet ? 'Yes' : 'No'} />
                  <View style={styles.toggleRow}>
                    <Text style={[styles.metricLabel, { flex: 1 }]}>Biometric unlock</Text>
                    <Switch
                      value={snapshot.security.biometricEnabled}
                      onValueChange={handleToggleBiometric}
                      disabled={biometricDisabled}
                      accessibilityLabel="Toggle biometric unlock"
                    />
                  </View>
                  {!snapshot.security.biometricAvailable ? (
                    <Text style={[styles.helperText, { color: colors.text.tertiary }]}>Device does not report biometric support.</Text>
                  ) : null}
                  {!snapshot.security.pinSet ? (
                    <Text style={[styles.helperText, { color: colors.text.tertiary }]}>Set a PIN to enable biometric unlock.</Text>
                  ) : null}
                </Section>
              </>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <Button
              title="Status report"
              onPress={handleExport}
              loading={exporting}
              accessibilityLabel="Export status report"
            />
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    paddingHorizontal: spacing.spacer16,
    paddingTop: spacing.spacer20,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  header: {
    marginBottom: spacing.spacer16,
  },
  title: {
    ...typography.lg,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.sm,
    marginTop: 2,
  },
  timestamp: {
    ...typography.xs,
    marginTop: spacing.spacer4,
  },
  content: {
    paddingBottom: spacing.spacer16,
  },
  section: {
    marginBottom: spacing.spacer20,
  },
  sectionTitle: {
    ...typography.sm,
    fontWeight: '600',
    marginBottom: spacing.spacer12,
  },
  metricRow: {
    marginBottom: spacing.spacer8,
  },
  metricLabel: {
    ...typography.sm,
    color: '#666',
  },
  metricValueContainer: {
    marginTop: 2,
  },
  metricValue: {
    ...typography.md,
    fontWeight: '500',
  },
  metricDetail: {
    ...typography.xs,
    marginTop: 2,
    color: '#666',
  },
  scopeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spacer8,
  },
  scopePill: {
    borderRadius: radius.lg,
    paddingVertical: 4,
    paddingHorizontal: spacing.spacer12,
  },
  scopeText: {
    ...typography.sm,
    fontWeight: '500',
  },
  emptyScopes: {
    ...typography.sm,
  },
  toggleRow: {
    marginTop: spacing.spacer12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helperText: {
    ...typography.xs,
    marginTop: spacing.spacer6,
  },
  footer: {
    paddingBottom: spacing.spacer20,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: spacing.spacer20,
  },
});
