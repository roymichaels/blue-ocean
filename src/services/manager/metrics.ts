import type {
  DispatchAssignment,
  InventorySnapshot,
  ServiceZone,
} from '@/types';
import {
  getOperationsGeneratedAt,
  loadDispatchAssignments,
  loadInventorySnapshots,
  loadServiceZones,
} from './operationsData';

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ZoneCoverageDatum {
  zoneId: string;
  zoneName: string;
  coverage: number;
  activeDrivers: number;
  targetDrivers: number;
  backlog: number;
  slaMinutes: number;
  ordersInFlight: number;
}

export interface LowStockDatum {
  id: string;
  productName: string;
  zoneName: string;
  quantity: number;
  threshold: number;
  restockEta?: string;
  velocity?: number;
  unit?: string;
  lastUpdated: string;
}

export interface RestockDatum extends LowStockDatum {
  recommendedOrder: number;
}

export type QuickActionKind = 'export' | 'telegram';

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  kind: QuickActionKind;
  payload?: Record<string, unknown>;
}

export interface EmpireMetrics {
  summary: {
    revenueToday: number;
    ordersDelivered: number;
    avgOrderValue: number;
    activeDrivers: number;
    coveragePct: number;
    lowStockCount: number;
    restockCount: number;
  };
  revenueSeries: ChartPoint[];
  volumeSeries: ChartPoint[];
  zoneCoverage: ZoneCoverageDatum[];
  lowStock: LowStockDatum[];
  restockQueue: RestockDatum[];
  quickExports: QuickAction[];
  telegramBursts: QuickAction[];
  lastUpdated: string;
}

const ACTIVE_DRIVER_WINDOW_MINUTES = 120;
const ACTIVE_STATUSES: DispatchAssignment['status'][] = [
  'available',
  'en_route',
  'delivering',
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60);
}

function bucketAssignments(
  assignments: DispatchAssignment[],
  extractor: (assignment: DispatchAssignment) => number,
): ChartPoint[] {
  if (!assignments.length) return [];
  const buckets = new Map<number, number>();
  for (const assignment of assignments) {
    const completedAt = parseDate(assignment.completedAt);
    if (!completedAt) continue;
    const bucketKey = Date.UTC(
      completedAt.getUTCFullYear(),
      completedAt.getUTCMonth(),
      completedAt.getUTCDate(),
      completedAt.getUTCHours(),
    );
    const current = buckets.get(bucketKey) ?? 0;
    buckets.set(bucketKey, current + extractor(assignment));
  }
  const ordered = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  return ordered.map(([key, value]) => ({
    label: `${new Date(key).getUTCHours().toString().padStart(2, '0')}:00`,
    value,
  }));
}

function toLowStockDatum(snapshot: InventorySnapshot): LowStockDatum {
  return {
    id: snapshot.id,
    productName: snapshot.productName,
    zoneName: snapshot.zoneName,
    quantity: snapshot.quantity,
    threshold: snapshot.threshold,
    restockEta: snapshot.restockEta,
    velocity: snapshot.velocity,
    unit: snapshot.unit,
    lastUpdated: snapshot.lastUpdated,
  };
}

function toRestockDatum(snapshot: InventorySnapshot): RestockDatum {
  const baseline = toLowStockDatum(snapshot);
  const recommendedOrder = Math.max(snapshot.threshold * 2 - snapshot.quantity, 0);
  return { ...baseline, recommendedOrder };
}

function computeZoneCoverage(
  zones: ServiceZone[],
  assignments: DispatchAssignment[],
): ZoneCoverageDatum[] {
  return zones.map((zone) => {
    const zoneAssignments = assignments.filter((assignment) => assignment.zoneId === zone.id);
    const activeDriverIds = new Set(
      zoneAssignments
        .filter((assignment) => ACTIVE_STATUSES.includes(assignment.status))
        .map((assignment) => assignment.driverId),
    );
    const activeDrivers = activeDriverIds.size;
    const targetDrivers = zone.targetDrivers || 1;
    const coverage = clamp(activeDrivers / targetDrivers, 0, 1);
    const ordersInFlight = zoneAssignments
      .filter((assignment) =>
        assignment.status === 'delivering' || assignment.status === 'en_route',
      )
      .reduce((sum, assignment) => sum + Math.max(assignment.ordersInFlight, 0), 0);
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      coverage,
      activeDrivers,
      targetDrivers,
      backlog: ordersInFlight,
      slaMinutes: zone.serviceLevelMinutes,
      ordersInFlight: zoneAssignments.filter(
        (assignment) => assignment.status === 'delivering' || assignment.status === 'en_route',
      ).length,
    };
  });
}

export async function fetchEmpireMetrics(storeId?: string): Promise<EmpireMetrics> {
  const [inventory, assignments, zones] = await Promise.all([
    loadInventorySnapshots(storeId),
    loadDispatchAssignments(storeId),
    loadServiceZones(storeId),
  ]);

  const generatedAt = getOperationsGeneratedAt();
  const reference = generatedAt ? new Date(generatedAt) : new Date();

  const todaysAssignments = assignments.filter((assignment) => {
    const completedAt = parseDate(assignment.completedAt);
    return completedAt ? isSameDay(reference, completedAt) : false;
  });

  const revenueToday = todaysAssignments.reduce(
    (sum, assignment) => sum + Math.max(assignment.orderValue || 0, 0),
    0,
  );
  const ordersDelivered = todaysAssignments.length;
  const avgOrderValue = ordersDelivered ? revenueToday / ordersDelivered : 0;

  const revenueSeries = bucketAssignments(todaysAssignments, (assignment) =>
    Math.max(assignment.orderValue || 0, 0),
  );
  const volumeSeries = bucketAssignments(todaysAssignments, () => 1);

  const activeDriverIds = new Set(
    assignments
      .filter((assignment) => {
        if (!ACTIVE_STATUSES.includes(assignment.status)) return false;
        const lastSeen = parseDate(assignment.lastSeenAt);
        if (!lastSeen) return true;
        return minutesBetween(reference, lastSeen) <= ACTIVE_DRIVER_WINDOW_MINUTES;
      })
      .map((assignment) => assignment.driverId),
  );

  const zoneCoverage = computeZoneCoverage(zones, assignments);
  const coveragePct = zoneCoverage.length
    ? (zoneCoverage.reduce((acc, zone) => acc + zone.coverage, 0) / zoneCoverage.length) * 100
    : 0;

  const lowStock = inventory
    .filter((snapshot) => snapshot.quantity <= snapshot.threshold)
    .map(toLowStockDatum)
    .sort((a, b) => a.quantity - b.quantity);

  const restockQueue = inventory
    .filter((snapshot) => snapshot.restockEta)
    .map(toRestockDatum)
    .sort((a, b) => {
      const aDate = parseDate(a.restockEta);
      const bDate = parseDate(b.restockEta);
      if (aDate && bDate) return aDate.getTime() - bDate.getTime();
      if (aDate) return -1;
      if (bDate) return 1;
      return b.quantity - a.quantity;
    });

  const quickExports: QuickAction[] = [
    {
      id: 'export-ledger',
      label: 'Export Empire Ledger',
      description: `₪${Math.round(revenueToday).toLocaleString('he-IL')} captured today`,
      kind: 'export',
      payload: { type: 'ledger', storeId, revenueToday },
    },
    {
      id: 'export-dispatch',
      label: 'Dispatch Heatmap CSV',
      description: `${activeDriverIds.size} active drivers across ${zoneCoverage.length} zones`,
      kind: 'export',
      payload: { type: 'dispatch', storeId, zones: zoneCoverage.length },
    },
  ];

  const telegramBursts: QuickAction[] = [
    {
      id: 'telegram-daily-pulse',
      label: 'Push Daily Pulse',
      description: `${ordersDelivered} drops | ₪${Math.round(revenueToday).toLocaleString('he-IL')}`,
      kind: 'telegram',
      payload: {
        template: 'daily_pulse',
        orders: ordersDelivered,
        revenue: revenueToday,
        coverage: Math.round(coveragePct),
      },
    },
    {
      id: 'telegram-low-stock',
      label: 'Alert Low Stock',
      description: `${lowStock.length} skus breaching floor`,
      kind: 'telegram',
      payload: {
        template: 'low_stock',
        items: lowStock.map((item) => ({
          product: item.productName,
          qty: item.quantity,
          zone: item.zoneName,
        })),
      },
    },
  ];

  return {
    summary: {
      revenueToday,
      ordersDelivered,
      avgOrderValue,
      activeDrivers: activeDriverIds.size,
      coveragePct,
      lowStockCount: lowStock.length,
      restockCount: restockQueue.length,
    },
    revenueSeries,
    volumeSeries,
    zoneCoverage,
    lowStock,
    restockQueue,
    quickExports,
    telegramBursts,
    lastUpdated: generatedAt || new Date().toISOString(),
  };
}
