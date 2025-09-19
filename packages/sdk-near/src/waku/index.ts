// Basic helpers for reading data from the Waku store. These functions intentionally
// avoid depending on the rest of the application so that the SDK can be used on
// its own. The logic here mirrors the higher level Waku utilities found in the
// app source but is trimmed down for size and to avoid React dependencies.

import { createLightNode, waitForRemotePeer, Protocols, type LightNode } from '@waku/sdk';
import { Buffer } from 'buffer';
import { topicFor } from '@blue-ocean/utils';
import { getNetworkId } from '../config';

// In-memory cache of messages keyed by topic. Each topic also tracks a set of
// previously seen payloads to avoid duplications when `hydrateMessages` is called
// multiple times.
const messageCache = new Map<string, any[]>();
const seenCache = new Map<string, Set<string>>();
let node: LightNode | null = null;

async function ensureNode(): Promise<LightNode | null> {
  if (node) return node;
  try {
    node = await createLightNode({} as any);
    if (!node) return null;
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
export async function hydrateMessages(
  topic: string,
  timeBudgetMs = 2500,
): Promise<any[]> {
  const n = await ensureNode();
  if (!n) return messageCache.get(topic) || [];
  
  // Import createDecoder dynamically to avoid bundling issues
  const { createDecoder } = await import('@waku/sdk');
  const decoder = createDecoder(topic, {});
  const existing = messageCache.get(topic) || [];
  const seen = seenCache.get(topic) || new Set<string>();
  const start = Date.now();
  let total = 0;
  let duplicates = 0;
  for await (const batch of (n.store.queryGenerator as any)({ decoder })) {
    for (const msg of batch.messages || []) {
      if (!msg.payload) continue;
      total += 1;
      const key = Buffer.from(msg.payload).toString('hex');
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      try {
        const parsed = JSON.parse(Buffer.from(msg.payload).toString('utf8'));
        existing.push(parsed);
      } catch {
        // ignore unparsable messages
      }
    }
    if (Date.now() - start > timeBudgetMs) {
      break;
    }
  }
  const duration = Date.now() - start;
  seenCache.set(topic, seen);
  messageCache.set(topic, existing);
  if (duration > timeBudgetMs) {
    console.warn('hydrateMessages time budget exceeded', {
      topic,
      duration,
      total,
      duplicates,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    console.debug('hydrateMessages', { topic, duration, total, duplicates });
  }
  return existing;
}

// Convenience function used by the SDK's `getListings` method. It hydrates the
// listings topic for the given store and returns the cached messages formatted
// as Listing objects.
export async function getListingsFromWaku(storeId: string) {
  try {
    const network = getNetworkId();
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

