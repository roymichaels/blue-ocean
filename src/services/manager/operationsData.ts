import operationsSeed from '@/assets/seed/operations.json';
import { jsonClone } from '@/utils/jsonClone';
import type { DispatchAssignment, InventorySnapshot, ServiceZone } from '@/types';

interface OperationsSeed {
  generatedAt?: string;
  inventory_snapshots?: InventorySnapshot[];
  dispatch_assignments?: DispatchAssignment[];
  zones?: ServiceZone[];
}

const dataset: OperationsSeed = operationsSeed as OperationsSeed;

function filterByStore<T extends { storeId?: string }>(
  items: T[],
  storeId?: string,
): T[] {
  if (!storeId) return items;
  return items.filter((item) => !item.storeId || item.storeId === storeId);
}

export function getOperationsGeneratedAt(): string | null {
  return dataset.generatedAt ?? null;
}

export async function loadInventorySnapshots(
  storeId?: string,
): Promise<InventorySnapshot[]> {
  const records = Array.isArray(dataset.inventory_snapshots)
    ? dataset.inventory_snapshots
    : [];
  const filtered = filterByStore(records, storeId);
  return jsonClone(filtered);
}

export async function loadDispatchAssignments(
  storeId?: string,
): Promise<DispatchAssignment[]> {
  const records = Array.isArray(dataset.dispatch_assignments)
    ? dataset.dispatch_assignments
    : [];
  const filtered = filterByStore(records, storeId);
  return jsonClone(filtered);
}

export async function loadServiceZones(storeId?: string): Promise<ServiceZone[]> {
  const records = Array.isArray(dataset.zones) ? dataset.zones : [];
  const filtered = filterByStore(records, storeId);
  return jsonClone(filtered);
}
