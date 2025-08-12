import {
  LightNode,
  createLightNode,
  waitForRemotePeer,
  createEncoder,
  Protocols,
  utf8ToBytes,
} from '@waku/sdk';
import { getWakuBootstrapNodes } from '../utils/appConfig';
import { OrderStatus } from '../types';

export type OrderEventType =
  | 'order.created'
  | 'order.updated'
  | 'order.deleted';

export interface OrderEvent {
  type: OrderEventType;
  orderId: string;
  prevStatus?: OrderStatus | null;
  newStatus?: OrderStatus | 'deleted';
  actor: string;
  timestamp: number;
}

const ORDER_TOPIC = '/congress/orders/1';
const DEFAULT_BOOTSTRAP =
  '/dns4/node.waku.nodes.status.im/tcp/443/wss/p2p/16Uiu2HAmSWvkpawuUxEe7dBDEu79SU1YEYTbSsfXrVvjJAnGqsRP';
let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    const bootstrap = getWakuBootstrapNodes();
    if (bootstrap.length === 0) {
      console.warn(
        'No Waku bootstrap nodes configured; using default bootstrap. Please configure your own nodes.',
      );
      bootstrap.push(DEFAULT_BOOTSTRAP);
    }
    node = await createLightNode({ libp2p: { bootstrap } });
    await node.start();
    await waitForRemotePeer(node, [Protocols.Relay]);
    return node;
  } catch (err) {
    console.error('Failed to start Waku node', err);
    node = null;
    return null;
  }
}

export async function logOrderEvent(event: OrderEvent): Promise<void> {
  const n = await ensureNode();
  if (!n) return;
  try {
    const encoder = createEncoder({ contentTopic: ORDER_TOPIC });
    await n.lightPush.send(encoder, {
      payload: utf8ToBytes(JSON.stringify(event)),
    });
  } catch (err) {
    console.error('Failed to log order event', err);
  }
}
