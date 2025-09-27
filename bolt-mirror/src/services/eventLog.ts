// @ts-nocheck
import { errorLog } from '@/utils/logger';
import { getClient } from '@/utils/transport';
import { uuid } from '../utils/uuid';
import { OrderStatus } from '../types';
import { canonicalJson } from '@/utils/serialization';
import { ensureRelayNode } from '@/services/wakuNode';

export type OrderEventType =
  | 'order.created'
  | 'order.updated'
  | 'order.deleted';

export interface OrderEvent {
  id: string;
  tenant: string;
  type: OrderEventType;
  payload: {
    orderId: string;
    prevStatus?: OrderStatus | null;
    newStatus?: OrderStatus | 'deleted';
  };
  actor: string;
  timestamp: number;
}

const ORDER_TOPIC = '/blue-ocean/orders/1';
const ensureNode = ensureRelayNode;

export async function logOrderEvent(
  event: Omit<OrderEvent, 'id'>,
): Promise<void> {
  const n = await ensureNode();
  if (!n) return;
  try {
    const eventWithId: OrderEvent = { id: uuid(), ...event };
    const client = await getClient();
    const encoder = client.createEncoder({ contentTopic: ORDER_TOPIC });
    await n.lightPush.send(encoder, {
      payload: client.utf8ToBytes(canonicalJson(eventWithId)),
    });
  } catch (err) {
    errorLog('Failed to log order event', err);
  }
}
