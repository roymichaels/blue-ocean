import { useCallback, useEffect, useMemo, useState } from 'react';

import { scheduleIdleTask } from '../utils/scheduler';

export interface MetricSummary {
  id: string;
  label: string;
  value: number;
  unit?: string;
  delta: number;
  caption: string;
  trend: number[];
  format?: 'percentage' | 'duration' | 'count';
}

export type GadgetStatus = 'online' | 'degraded' | 'standby';

export interface GadgetSummary {
  id: string;
  name: string;
  description: string;
  status: GadgetStatus;
  statusLabel: string;
  accent: string;
  throughput: string;
  signal: string;
  health: string;
}

export type InsightIntent = 'alert' | 'upgrade' | 'success';

export interface InsightSummary {
  id: string;
  title: string;
  summary: string;
  intent: InsightIntent;
  intentLabel: string;
  confidence: number;
  timestamp: string;
  timestampISO: string;
}

export type ActivitySeverity = 'critical' | 'warning' | 'info' | 'success';

export interface ActivityEvent {
  id: string;
  title: string;
  actor: string;
  timestamp: string;
  timestampISO: string;
  description: string;
  severity: ActivitySeverity;
  location?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  hint?: string;
  onTrigger?: () => void;
}

interface DashboardState {
  metrics: MetricSummary[];
  gadgets: GadgetSummary[];
  events: ActivityEvent[];
  insights: InsightSummary[];
}

const STORAGE_KEY = 'bo:gadget-lab::state-v1';

const DEFAULT_STATE: DashboardState = {
  metrics: [
    {
      id: 'uptime',
      label: 'Mesh uptime',
      value: 99.982,
      unit: '%',
      delta: 0.12,
      caption: 'vs. previous 24h',
      trend: [99.7, 99.74, 99.79, 99.81, 99.86, 99.9],
      format: 'percentage',
    },
    {
      id: 'orders',
      label: 'Orders settled',
      value: 182,
      delta: 3.4,
      caption: 'last 60 minutes',
      trend: [118, 126, 133, 144, 158, 182],
      format: 'count',
    },
    {
      id: 'latency',
      label: 'Relay latency P95',
      value: 184,
      unit: 'ms',
      delta: -7.1,
      caption: 'across 18 relays',
      trend: [212, 207, 201, 194, 189, 184],
      format: 'duration',
    },
  ],
  gadgets: [
    {
      id: 'relay',
      name: 'Arctic Relay Node',
      description: 'Routes encrypted orders with adaptive load shedding across the mesh.',
      status: 'online',
      statusLabel: 'ONLINE',
      accent: '#38bdf8',
      throughput: '2.4k pkts/s',
      signal: 'Signal lock',
      health: '99.4% health',
    },
    {
      id: 'vault',
      name: 'ZeroTrace Vault',
      description: 'Sharded cold storage with deterministic sealing and tamper proofs.',
      status: 'standby',
      statusLabel: 'STANDBY',
      accent: '#8b5cf6',
      throughput: '512 MB/s write',
      signal: 'Seal verified',
      health: 'Awaiting rotate',
    },
    {
      id: 'uplink',
      name: 'Subcarrier Uplink',
      description: 'Burst uplink for covert drops with predictive throttling.',
      status: 'degraded',
      statusLabel: 'DEGRADED',
      accent: '#f97316',
      throughput: '420 kbps',
      signal: '3 hops',
      health: 'Needs recalibration',
    },
  ],
  events: [
    {
      id: 'event-1',
      title: 'Mesh handshake complete',
      actor: 'Ops mesh',
      timestamp: '08:58',
      timestampISO: '2024-05-15T08:58:00Z',
      description: 'All 18 nodes responded under 200ms.',
      severity: 'info',
      location: 'Global mesh',
    },
    {
      id: 'event-2',
      title: 'Cold vault resealed',
      actor: 'ZeroTrace',
      timestamp: '09:12',
      timestampISO: '2024-05-15T09:12:00Z',
      description: 'Integrity proofs rotated and signed by quorum.',
      severity: 'success',
      location: 'Vault cluster',
    },
    {
      id: 'event-3',
      title: 'Anomaly flagged on uplink',
      actor: 'Signal daemon',
      timestamp: '09:24',
      timestampISO: '2024-05-15T09:24:00Z',
      description: 'Packet loss spiked beyond baseline. Adaptive throttling engaged.',
      severity: 'warning',
      location: 'Subcarrier-7',
    },
    {
      id: 'event-4',
      title: 'Encrypted drop delivered',
      actor: 'Courier swarm',
      timestamp: '09:51',
      timestampISO: '2024-05-15T09:51:00Z',
      description: 'Payload decrypted successfully on recipient enclave.',
      severity: 'info',
    },
  ],
  insights: [
    {
      id: 'insight-1',
      title: 'Photon spool nearing saturation',
      summary: 'Route overflow to cold storage before 23:00 UTC to avoid congestion.',
      intent: 'alert',
      intentLabel: 'Alert',
      confidence: 0.82,
      timestamp: '09:20 UTC',
      timestampISO: '2024-05-15T09:20:00Z',
    },
    {
      id: 'insight-2',
      title: 'Vault seal rotation ready',
      summary: 'Next zero-knowledge seal cycle precomputed. Safe to roll during off-peak window.',
      intent: 'upgrade',
      intentLabel: 'Maintenance',
      confidence: 0.64,
      timestamp: '09:34 UTC',
      timestampISO: '2024-05-15T09:34:00Z',
    },
    {
      id: 'insight-3',
      title: 'Courier swarm energy surplus',
      summary: 'Batteries charged above 92%. Schedule extended patrol or shift to analytics.',
      intent: 'success',
      intentLabel: 'Good news',
      confidence: 0.93,
      timestamp: '09:48 UTC',
      timestampISO: '2024-05-15T09:48:00Z',
    },
  ],
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const persistState = (state: DashboardState) => {
  if (typeof window === 'undefined') {
    return;
  }
  scheduleIdleTask(() => {
    try {
      const payload = JSON.stringify({
        metrics: state.metrics,
        gadgets: state.gadgets,
        events: state.events.slice(0, 8),
        insights: state.insights.slice(0, 4),
      });
      window.localStorage?.setItem(STORAGE_KEY, payload);
    } catch {
      // Ignore quota or private mode failures.
    }
  }, 600);
};

const restoreState = (): DashboardState => {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }
  try {
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(stored) as Partial<DashboardState>;
    return {
      metrics: parsed.metrics ?? DEFAULT_STATE.metrics,
      gadgets: parsed.gadgets ?? DEFAULT_STATE.gadgets,
      events: parsed.events ?? DEFAULT_STATE.events,
      insights: parsed.insights ?? DEFAULT_STATE.insights,
    };
  } catch {
    return DEFAULT_STATE;
  }
};

export function useDashboardData() {
  const [state, setState] = useState<DashboardState>(() => restoreState());

  useEffect(() => {
    persistState(state);
  }, [state]);

  const runMeshSync = useCallback(() => {
    setState((prev) => {
      const now = new Date();
      const iso = now.toISOString();
      const event: ActivityEvent = {
        id: `sync-${iso}`,
        title: 'Workspace sync dispatched',
        actor: 'Mesh orchestrator',
        timestamp: formatTime(now),
        timestampISO: iso,
        description: 'Queued delta sync for offline peers.',
        severity: 'info',
        location: 'Distributed mesh',
      };
      return {
        ...prev,
        events: [event, ...prev.events].slice(0, 7),
      };
    });
  }, []);

  const captureSnapshot = useCallback(() => {
    setState((prev) => {
      const metrics = prev.metrics.map((metric) => {
        if (metric.id === 'uptime') {
          const nextTrend = [...metric.trend.slice(1), metric.trend[metric.trend.length - 1] + 0.02];
          return {
            ...metric,
            value: Math.min(metric.value + 0.01, 99.995),
            delta: Number(Math.min(metric.delta + 0.05, 0.6).toFixed(2)),
            trend: nextTrend,
          };
        }
        if (metric.id === 'orders') {
          const nextValue = metric.value + 6;
          const nextTrend = [...metric.trend.slice(1), nextValue];
          return {
            ...metric,
            value: nextValue,
            delta: Number((metric.delta + 0.3).toFixed(1)),
            trend: nextTrend,
          };
        }
        if (metric.id === 'latency') {
          const nextTrend = [...metric.trend.slice(1), Math.max(metric.trend[metric.trend.length - 1] - 3, 160)];
          return {
            ...metric,
            value: Math.max(metric.value - 4, 150),
            delta: Number(Math.max(metric.delta - 0.4, -12).toFixed(1)),
            trend: nextTrend,
          };
        }
        return metric;
      });
      return {
        ...prev,
        metrics,
      };
    });
  }, []);

  const broadcastStatus = useCallback(() => {
    setState((prev) => {
      const now = new Date();
      const iso = now.toISOString();
      const insight: InsightSummary = {
        id: `insight-${iso}`,
        title: 'Mesh broadcast scheduled',
        summary: 'Notifications queued for field teams with offline fallback packages.',
        intent: 'success',
        intentLabel: 'Broadcast',
        confidence: 0.68,
        timestamp: `${formatTime(now)} UTC`,
        timestampISO: iso,
      };
      return {
        ...prev,
        insights: [insight, ...prev.insights].slice(0, 4),
      };
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const interval = window.setInterval(() => {
      setState((prev) => {
        const metrics = prev.metrics.map((metric) => {
          if (metric.id !== 'orders') {
            return metric;
          }
          const variation = Math.sin(Date.now() / 120000) * 2;
          const nextValue = metric.value + variation;
          const nextTrend = [...metric.trend.slice(1), Math.max(nextValue, 1)];
          return {
            ...metric,
            value: Math.max(nextValue, 0),
            trend: nextTrend,
          };
        });
        return {
          ...prev,
          metrics,
        };
      });
    }, 20000);
    return () => window.clearInterval(interval);
  }, []);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: 'sync',
        label: 'Sync mesh',
        hint: '⇧R',
        onTrigger: runMeshSync,
      },
      {
        id: 'snapshot',
        label: 'Capture snapshot',
        hint: '⌘K',
        onTrigger: captureSnapshot,
      },
      {
        id: 'broadcast',
        label: 'Broadcast status',
        hint: 'B',
        onTrigger: broadcastStatus,
      },
    ],
    [broadcastStatus, captureSnapshot, runMeshSync],
  );

  return {
    metrics: state.metrics,
    gadgets: state.gadgets,
    events: state.events,
    insights: state.insights,
    quickActions,
  };
}
