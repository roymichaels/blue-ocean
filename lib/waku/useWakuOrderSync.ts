import { useEffect } from 'react';
import { store } from '../memoryStore';
import { getTenant } from '../../constants/tenant';
import { decryptWakuPayload } from './wakuCrypto';
import { requireConfig } from '../../utils/env';

export const useWakuOrderSync = () => {
  useEffect(() => {
    let node: any;
    let decoder: any;

    const run = async () => {
      const enabled = await requireConfig('EXPO_PUBLIC_USE_WAKU').catch(() => 'false');
      if (enabled !== 'true') return;
      const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
      const { verify, etc: edBytes } = await import('@noble/ed25519');
      const { sha256 } = await import('@noble/hashes/sha256');
      node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Store, Protocols.LightPush]);

      decoder = node.createDecoder({ contentTopic: '/congress/orders/1/proto' });
      await node.filter!.subscribe(decoder, async (msg) => {
        if (!msg.payload) return;
        const decoded = new TextDecoder().decode(msg.payload);
        const plaintext = await decryptWakuPayload(decoded);
        try {
          const parsed = JSON.parse(plaintext);
          if (!parsed.signature || !parsed.sender?.publicKey) {
            return;
          }
          const verifyObj = {
            type: parsed.type,
            order: parsed.order,
            sender: {
              id: parsed.sender.id,
              publicKey: parsed.sender.publicKey,
              role: parsed.sender.role,
            },
          };
          const hash = sha256(new TextEncoder().encode(JSON.stringify(verifyObj)));
          const ok = await verify(
            edBytes.hexToBytes(parsed.signature),
            hash,
            edBytes.hexToBytes(parsed.sender.publicKey)
          );
          if (!ok || parsed.sender.role !== 'admin') {

            return;
          }
          if (!store.users.has(parsed.sender.id)) return;
          if (parsed.type === 'order.update' && parsed.order) {
            const o = parsed.order;
            const tenant = await getTenant();
            store.orders.set(o.id, {
              ...o,
              tenant_id: o.tenant_id ?? tenant,
            });
          }
        } catch (e) {
          console.error('Invalid Waku message:', e);
        }
      });
    };

    run();

    return () => {
      if (decoder && node?.filter) {
        node.filter.unsubscribe(decoder).catch(() => {});
      }
      node?.stop();
    };
  }, []);
};
