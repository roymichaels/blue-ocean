// @ts-nocheck
import { errorLog } from '@/utils/logger';
import type { LightNode } from '@waku/sdk';
import { getClient } from '@/utils/transport';
import { uuid } from '../utils/uuid';
import { getWakuBootstrapNodes } from '../utils/appConfig';
import { OrderStatus } from '../types';

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
let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    if ((process.env.EXPO_PUBLIC_TRANSPORT || '').toLowerCase() !== 'waku') {
      return null;
    }
    const bootstrap = getWakuBootstrapNodes();
    if (bootstrap.length === 0) return null;
    const { createLightNode, waitForRemotePeer, Protocols } = await getClient();
    node = await createLightNode({ libp2p: { bootstrap } });
    if (!node) return null;
    await node.start();
    await waitForRemotePeer(node, [Protocols.Relay]);
    return node;
  } catch (err) {
    errorLog('Failed to start Waku node', err);
    node = null;
    return null;
  }
}

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
      payload: client.utf8ToBytes(JSON.stringify(eventWithId)),
    });
  } catch (err) {
    errorLog('Failed to log order event', err);
  }
}
