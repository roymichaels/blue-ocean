import { debugLog, errorLog } from '@/utils/logger';
import {
  LightNode,
  createLightNode,
  waitForRemotePeer,
  createEncoder,
  Protocols,
  utf8ToBytes,
} from '@waku/sdk';
import { randomUUID } from 'crypto';
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
const DEFAULT_BOOTSTRAP =
  '/dns4/node.waku.nodes.status.im/tcp/443/wss/p2p/16Uiu2HAmSWvkpawuUxEe7dBDEu79SU1YEYTbSsfXrVvjJAnGqsRP';
let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    const bootstrap = getWakuBootstrapNodes();
    if (bootstrap.length === 0) {
      debugLog(
        'No Waku bootstrap nodes configured; using default bootstrap. Please configure your own nodes.',
      );
      bootstrap.push(DEFAULT_BOOTSTRAP);
    }
    node = await createLightNode({ libp2p: { bootstrap } });
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
    const eventWithId: OrderEvent = { id: randomUUID(), ...event };
    const encoder = createEncoder({ contentTopic: ORDER_TOPIC });
    await n.lightPush.send(encoder, {
      payload: utf8ToBytes(JSON.stringify(eventWithId)),
    });
  } catch (err) {
    errorLog('Failed to log order event', err);
  }
}
