import { errorLog } from '@/utils/logger';
import { getClient } from '@/utils/transport';
import config from '@/config';
import type { LightNode } from '@waku/sdk';

type WakuModule = typeof import('@waku/sdk');
type ProtocolMap = WakuModule['Protocols'];
type ProtocolValue = ProtocolMap[keyof ProtocolMap];
type ProtocolSelection = ProtocolValue | ProtocolValue[] | null | undefined;
type ProtocolSelector = (protocols: ProtocolMap) => ProtocolSelection;

function isWakuTransportEnabled(): boolean {
  return (config.EXPO_PUBLIC_TRANSPORT || '').toLowerCase() === 'waku';
}

function toProtocolArray(
  protocols: ProtocolMap,
  selectProtocols?: ProtocolSelector,
): ProtocolValue[] {
  const selection = selectProtocols?.(protocols);
  const array = Array.isArray(selection)
    ? selection
    : selection
      ? [selection]
      : [protocols.Relay];
  return array.filter((value): value is ProtocolValue => Boolean(value));
}

async function startLightNode(
  selectProtocols?: ProtocolSelector,
): Promise<LightNode | null> {
  const { createLightNode, waitForRemotePeer, Protocols } = await getClient();
  const node = await createLightNode({} as any);
  if (!node) return null;
  await node.start();
  const requiredProtocols = toProtocolArray(Protocols, selectProtocols);
  await waitForRemotePeer(node, requiredProtocols);
  return node;
}

export interface EnsureNodeOptions {
  selectProtocols?: ProtocolSelector;
  enabled?: () => boolean;
}

export function createEnsureNode({
  selectProtocols,
  enabled,
}: EnsureNodeOptions = {}): () => Promise<LightNode | null> {
  let node: LightNode | null = null;
  const isEnabled = enabled ?? isWakuTransportEnabled;
  return async () => {
    if (!isEnabled()) return null;
    if (node) return node;
    try {
      const started = await startLightNode(selectProtocols);
      node = started;
      return started;
    } catch (err) {
      errorLog('Failed to start Waku node', err);
      node = null;
      return null;
    }
  };
}

export const ensureRelayNode = createEnsureNode();
