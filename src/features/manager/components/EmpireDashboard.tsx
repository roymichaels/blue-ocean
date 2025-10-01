import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Download, Send } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { Spinner } from '@/ui/primitives';
import { useEmpireMetrics } from '../hooks/useEmpireMetrics';
import type { ChartPoint } from '@/services/manager/metrics';

interface EmpireDashboardProps {
  storeId?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(value);
}

function MetricCard({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function MiniBarChart({ points, color }: { points: ChartPoint[]; color: string }) {
  const chartHeight = 120;
  const maxValue = points.reduce((max, point) => Math.max(max, point.value), 0);

  if (!points.length || maxValue === 0) {
    return <Text style={styles.chartEmpty}>אין נתונים זמינים</Text>;
  }

  return (
    <View style={[styles.barChart, { height: chartHeight }]}> 
      {points.map((point) => {
        const barHeight = Math.max((point.value / maxValue) * chartHeight, 4);
        return (
          <View key={point.label} style={styles.barContainer}>
            <View style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
            <Text style={styles.barLabel}>{point.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ZoneCard({
  name,
  coverage,
  activeDrivers,
  targetDrivers,
  backlog,
  slaMinutes,
  accent,
}: {
  name: string;
  coverage: number;
  activeDrivers: number;
  targetDrivers: number;
  backlog: number;
  slaMinutes: number;
  accent: string;
}) {
  const percent = Math.round(coverage * 100);
  return (
    <View style={styles.zoneCard}>
      <View style={styles.zoneHeader}>
        <Text style={styles.zoneName}>{name}</Text>
        <Text style={[styles.zonePercent, { color: accent }]}>{percent}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: accent }]} />
      </View>
      <View style={styles.zoneMetaRow}>
        <Text style={styles.zoneMeta}>{`${activeDrivers}/${targetDrivers} נהגים פעילים`}</Text>
        <Text style={styles.zoneMeta}>{`Backlog ${backlog}`}</Text>
      </View>
      <Text style={styles.zoneMeta}>{`SLA ${slaMinutes} דק׳`}</Text>
    </View>
  );
}

function InsightRow({
  title,
  highlight,
  meta,
}: {
  title: string;
  highlight: string;
  meta?: string;
}) {
  return (
    <View style={styles.insightRow}>
      <View>
        <Text style={styles.insightTitle}>{title}</Text>
        {meta ? <Text style={styles.insightMeta}>{meta}</Text> : null}
      </View>
      <Text style={styles.insightHighlight}>{highlight}</Text>
    </View>
  );
}

function QuickAction({
  label,
  description,
  icon,
  accent,
  kind,
}: {
  label: string;
  description: string;
  icon: 'download' | 'send';
  accent: string;
  kind: 'export' | 'telegram';
}) {
  const Icon = icon === 'download' ? Download : Send;
  return (
    <TouchableOpacity
      style={styles.quickAction}
      activeOpacity={0.85}
      onPress={() => {}}
      accessibilityRole="button">
      <View style={styles.quickActionIcon}>
        <Icon color={accent} size={20} />
      </View>
      <View style={styles.quickActionText}>
        <Text style={styles.quickActionLabel}>{label}</Text>
        <Text style={styles.quickActionDescription}>{description}</Text>
      </View>
      <Text style={[styles.quickActionChip, { color: accent }]}>{kind === 'export' ? 'CSV' : 'Telegram'}</Text>
    </TouchableOpacity>
  );
}

export default function EmpireDashboard({ storeId }: EmpireDashboardProps) {
  const { colors } = useTheme();
  const accent = colors.gold ?? '#B99C5A';
  const background = colors.background ?? colors.canvas ?? '#0E0D0A';
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const { data, loading, error, refreshing, refetch } = useEmpireMetrics(storeId);

  const lastUpdated = useMemo(() => {
    if (!data?.lastUpdated) return '';
    const timestamp = new Date(data.lastUpdated);
    if (Number.isNaN(timestamp.getTime())) return '';
    return timestamp.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [data?.lastUpdated]);

  if (loading && !data) {
    return (
      <View style={[styles.loadingState, { backgroundColor: background }]}> 
        <Spinner />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void refetch();
          }}
          tintColor={accent}
        />
      }>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Empire Control Tower</Text>
          <Text style={styles.subtitle}>High-velocity cockpit for Telegram ops</Text>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.headerMetaText}>{`Last sync ${lastUpdated || '—'}`}</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              void refetch();
            }}
            activeOpacity={0.85}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorState}>
          <Text style={styles.errorText}>לא ניתן לטעון את נתוני הניהול.</Text>
          <TouchableOpacity
            onPress={() => {
              void refetch();
            }}
            style={styles.retryButton}
            activeOpacity={0.85}>
            <Text style={styles.retryText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {data ? (
        <>
          <View
            style={[
              styles.metricGrid,
              { flexDirection: isWide ? 'row' : 'column', flexWrap: isWide ? 'wrap' : 'nowrap' },
            ]}>
            <MetricCard
              label="Revenue Today"
              value={formatCurrency(data.summary.revenueToday)}
              subtitle={`Avg drop ${formatCurrency(data.summary.avgOrderValue)}`}
              accent={accent}
            />
            <MetricCard
              label="Drops Completed"
              value={formatNumber(data.summary.ordersDelivered)}
              subtitle={`${data.zoneCoverage.length} active zones`}
              accent={accent}
            />
            <MetricCard
              label="Active Drivers"
              value={formatNumber(data.summary.activeDrivers)}
              subtitle={`Coverage ${Math.round(data.summary.coveragePct)}%`}
              accent={accent}
            />
            <MetricCard
              label="Alerts"
              value={`${data.summary.lowStockCount} low · ${data.summary.restockCount} restock`}
              accent={accent}
            />
          </View>

          <View style={[styles.chartRow, { flexDirection: isWide ? 'row' : 'column' }]}> 
            <View style={[styles.chartCard, { flex: isWide ? 1 : undefined }]}> 
              <Text style={styles.sectionTitle}>Revenue velocity</Text>
              <MiniBarChart points={data.revenueSeries} color={accent} />
            </View>
            <View style={[styles.chartCard, { flex: isWide ? 1 : undefined }]}> 
              <Text style={styles.sectionTitle}>Orders per hour</Text>
              <MiniBarChart points={data.volumeSeries} color={accent} />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Zone coverage</Text>
            <View style={[styles.zoneGrid, { flexDirection: isWide ? 'row' : 'column' }]}>
              {data.zoneCoverage.map((zone) => (
                <ZoneCard
                  key={zone.zoneId}
                  name={zone.zoneName}
                  coverage={zone.coverage}
                  activeDrivers={zone.activeDrivers}
                  targetDrivers={zone.targetDrivers}
                  backlog={zone.backlog}
                  slaMinutes={zone.slaMinutes}
                  accent={accent}
                />
              ))}
            </View>
          </View>

          <View style={[styles.sectionBlock, { flexDirection: isWide ? 'row' : 'column' }]}> 
            <View style={[styles.insightCard, { flex: 1 }]}> 
              <Text style={styles.sectionTitle}>Low stock sentinels</Text>
              {data.lowStock.length === 0 ? (
                <Text style={styles.chartEmpty}>אין פריטים מתחת לסף.</Text>
              ) : (
                data.lowStock.slice(0, 6).map((item) => (
                  <InsightRow
                    key={item.id}
                    title={item.productName}
                    meta={`${item.zoneName} • Threshold ${item.threshold}`}
                    highlight={`${item.quantity} ${item.unit ?? 'units'}`}
                  />
                ))
              )}
            </View>
            <View style={[styles.insightCard, { flex: 1 }]}> 
              <Text style={styles.sectionTitle}>Restock queue</Text>
              {data.restockQueue.length === 0 ? (
                <Text style={styles.chartEmpty}>אין משלוחים לחדש.</Text>
              ) : (
                data.restockQueue.slice(0, 6).map((item) => (
                  <InsightRow
                    key={`${item.id}-restock`}
                    title={item.productName}
                    meta={`ETA ${item.restockEta ? new Date(item.restockEta).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—'}`}
                    highlight={`Order ${formatNumber(item.recommendedOrder)}`}
                  />
                ))
              )}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Quick dispatches</Text>
            <View style={[styles.quickActionsRow, { flexDirection: isWide ? 'row' : 'column' }]}>
              {data.quickExports.map((action) => (
                <QuickAction
                  key={action.id}
                  label={action.label}
                  description={action.description}
                  icon="download"
                  accent={accent}
                  kind="export"
                />
              ))}
              {data.telegramBursts.map((action) => (
                <QuickAction
                  key={action.id}
                  label={action.label}
                  description={action.description}
                  icon="send"
                  accent={accent}
                  kind="telegram"
                />
              ))}
            </View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 24,
    gap: 24,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  headerMetaText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: 'rgba(185, 156, 90, 0.6)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  refreshButtonText: {
    color: 'rgba(185, 156, 90, 0.9)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 4,
  },
  metricGrid: {
    gap: 16,
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 20,
    minWidth: 200,
    gap: 6,
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  metricSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  chartRow: {
    gap: 16,
  },
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  chartEmpty: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    width: 18,
    borderRadius: 9,
  },
  barLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  sectionBlock: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  zoneGrid: {
    gap: 16,
    flexWrap: 'wrap',
  },
  zoneCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoneName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  zonePercent: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  zoneMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  zoneMeta: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
  },
  insightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  insightMeta: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginTop: 4,
  },
  insightHighlight: {
    color: 'rgba(185, 156, 90, 0.95)',
    fontSize: 16,
    fontWeight: '700',
  },
  quickActionsRow: {
    gap: 16,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(185, 156, 90, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    flex: 1,
    gap: 4,
  },
  quickActionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  quickActionDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
  quickActionChip: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  errorState: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 61, 87, 0.1)',
    gap: 12,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 14,
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FF8A80',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryText: {
    color: '#FF8A80',
    fontWeight: '600',
  },
});

