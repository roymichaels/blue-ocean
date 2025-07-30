import { useEffect } from 'react';
import { store } from '../memoryStore';
import { decryptWakuPayload } from './wakuCrypto';
import config from '../../utils/appConfig';


export const useWakuProductSync = () => {
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

      decoder = node.createDecoder({ contentTopic: '/congress/products/1/proto' });
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
            product: parsed.product,
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
          if (parsed.type === 'product.update' && parsed.product) {
            const p = parsed.product;
            const updated = {
              ...p,
              images: p.images || [],
              videos: p.videos || [],
              colors: p.colors || [],
              badges: p.badges || [],
              rating: p.rating ?? 0,
              reviews: p.reviews ?? 0,
              pricingTier: p.pricingTier ?? null,
              mixGroupId: p.mixGroupId ?? null,
              stock: p.stock ?? 0,
              createdAt: p.createdAt ?? Date.now(),
              updatedAt: p.updatedAt ?? Date.now(),
            };
            const idx = store.products.findIndex((prod) => prod.id === p.id);
            if (idx >= 0) {
              store.products[idx] = updated as any;
            } else {
              store.products.push(updated as any);
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
