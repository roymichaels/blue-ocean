import { Order, OrderStatus } from '@/types';

export interface OrderTimelineEntry {
  status: OrderStatus;
  completed: boolean;
  isCurrent: boolean;
  timestamp: string | null;
}

const BASE_SEQUENCE: OrderStatus[] = [
  'order_received',
  'courier_found',
  'courier_picked_up',
  'courier_on_way',
  'delivered',
];

const POST_DELIVERED_SEQUENCE: OrderStatus[] = ['disputed', 'released', 'refunded'];

function uniqueStatuses(statuses: OrderStatus[]): OrderStatus[] {
  const seen = new Set<OrderStatus>();
  const ordered: OrderStatus[] = [];
  for (const status of statuses) {
    if (seen.has(status)) continue;
    seen.add(status);
    ordered.push(status);
  }
  return ordered;
}

function collectStatuses(order: Order): OrderStatus[] {
  const trackingStatuses = new Set<OrderStatus>(
    (order.trackingSteps ?? []).map((step) => step.status),
  );
  const sequence: OrderStatus[] = [...BASE_SEQUENCE];
  for (const status of POST_DELIVERED_SEQUENCE) {
    if (trackingStatuses.has(status) || order.status === status) {
      sequence.push(status);
    }
  }
  // ensure any additional tracking statuses are surfaced even if unexpected
  for (const status of trackingStatuses) {
    if (!sequence.includes(status)) {
      sequence.push(status);
    }
  }
  return uniqueStatuses(sequence);
}

export function buildTimelineEntries(order: Order): OrderTimelineEntry[] {
  const statuses = collectStatuses(order);
  if (statuses.length === 0) {
    return [
      {
        status: 'order_received',
        completed: true,
        isCurrent: true,
        timestamp: order.createdAt ?? null,
      },
    ];
  }
  const resolvedIndex = statuses.indexOf(order.status as OrderStatus);
  const currentIndex = resolvedIndex >= 0 ? resolvedIndex : Math.max(statuses.length - 1, 0);
  const stepMap = new Map(
    (order.trackingSteps ?? []).map((step) => [step.status, step]),
  );

  return statuses.map((status, index) => {
    const step = stepMap.get(status);
    const isCurrent = status === order.status;
    const completed = step?.completed ?? index <= currentIndex;
    let timestamp: string | null = step?.timestamp ?? null;
    if (!timestamp) {
      if (status === 'order_received') {
        timestamp = order.createdAt ?? null;
      } else if (isCurrent && order.updatedAt) {
        timestamp = order.updatedAt;
      } else if (completed && order.updatedAt) {
        timestamp = order.updatedAt;
      }
    }
    return {
      status,
      completed,
      isCurrent,
      timestamp,
    };
  });
}

export function getCurrentTimelineIndex(
  entries: OrderTimelineEntry[],
): number {
  return entries.findIndex((entry) => entry.isCurrent);
}

