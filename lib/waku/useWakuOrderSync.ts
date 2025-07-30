import { useEffect } from 'react';
import { store } from '../memoryStore';
import { getTenant } from '../../constants/tenant';
import { decryptWakuPayload } from './wakuCrypto';
import config from '../../utils/appConfig';

export const useWakuOrderSync = () => {
  useEffect(() => {
    let node: any;
    let decoder: any;

    const run = async () => {
      const enabled = config.EXPO_PUBLIC_USE_WAKU || 'false';
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
          const exists = store.users.some((u) => u.id === parsed.sender.id);
          if (!exists) return;
          if (parsed.type === 'order.update' && parsed.order) {
            const o = parsed.order;
            const tenant = await getTenant();
            const updated = {
              ...o,
              tenant_id: o.tenant_id ?? tenant,
              items: o.items || [],
            };
            const idx = store.orders.findIndex((ord) => ord.id === o.id);
            if (idx >= 0) {
              store.orders[idx] = updated as any;
            } else {
              store.orders.push(updated as any);
            }
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
