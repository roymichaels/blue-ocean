// Basic helpers for reading data from the Waku store. These functions intentionally
// avoid depending on the rest of the application so that the SDK can be used on
// its own. The logic here mirrors the higher level Waku utilities found in the
// app source but is trimmed down for size and to avoid React dependencies.

import type { LightNode } from '@waku/sdk';
import { createLightNode, waitForRemotePeer, Protocols, createDecoder } from '@waku/sdk';
import { Buffer } from 'buffer';
import { topicFor } from '@blue-ocean/utils';

// In-memory cache of messages keyed by topic. Each topic also tracks a set of
// previously seen payloads to avoid duplications when `hydrateMessages` is called
// multiple times.
const messageCache = new Map<string, any[]>();
const seenCache = new Map<string, Set<string>>();
let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    const bootstrap = (
      process.env.WAKU_BOOTSTRAP ||
      process.env.EXPO_PUBLIC_WAKU_BOOTSTRAP ||
      ''
      )
        .split(String.fromCharCode(44))
        .map((s) => s.trim())
      .filter(Boolean);
    node = await createLightNode({ libp2p: { bootstrap } } as any);
    await node.start();
    // The Store protocol is required to query historical messages.
    await waitForRemotePeer(node, [Protocols.Store]);
    return node;
  } catch {
    node = null;
    return null;
  }
}

/**
 * Fetch and cache all historical messages for a given topic.
 * Subsequent calls only append new unseen messages, preventing duplicates.
 */
export async function hydrateMessages(topic: string): Promise<any[]> {
  const n = await ensureNode();
  if (!n) return messageCache.get(topic) || [];
  const decoder = createDecoder(topic);
  const existing = messageCache.get(topic) || [];
  const seen = seenCache.get(topic) || new Set<string>();
  for await (const batch of (n.store.queryGenerator as any)({ decoder })) {
    for (const msg of (batch.messages || [])) {
      if (!msg.payload) continue;
      const key = Buffer.from(msg.payload).toString('hex');
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        const parsed = JSON.parse(Buffer.from(msg.payload).toString('utf8'));
        existing.push(parsed);
      } catch {
        // ignore unparsable messages
      }
    }
  }
  seenCache.set(topic, seen);
  messageCache.set(topic, existing);
  return existing;
}

// Convenience function used by the SDK's `getListings` method. It hydrates the
// listings topic for the given store and returns the cached messages formatted
// as Listing objects.
export async function getListingsFromWaku(storeId: string) {
  try {
    const network = process.env.EXPO_PUBLIC_NETWORK || 'testnet';
    const topic = topicFor(network, storeId, 'listings');
    const msgs = await hydrateMessages(topic);
    return msgs.map((m) => ({
      id: Number(m.itemId ?? 0),
      seller: m.seller || '',
      price: Number(m.priceYocto ?? 0),
    }));
    } catch (e) {
      console.warn('sdk-near', 'waku', 'get_listings_failed', e);
    return [] as any[];
  }
}

export default { getListingsFromWaku, hydrateMessages };

