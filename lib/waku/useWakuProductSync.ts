import { useEffect } from 'react';
import { executeSql } from '../sqlite';

export const useWakuProductSync = () => {
  useEffect(() => {
    let node: any;
    let decoder: any;

    const run = async () => {
      const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
      node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Store, Protocols.LightPush]);

      decoder = node.createDecoder({ contentTopic: '/congress/products/1' });
      await node.filter!.subscribe(decoder, async (msg) => {
        if (!msg.payload) return;
        const decoded = new TextDecoder().decode(msg.payload);
        try {
          const parsed = JSON.parse(decoded);
          if (parsed.type === 'product.update' && parsed.product) {
            const p = parsed.product;
            await executeSql(
              `INSERT OR REPLACE INTO products (
                id, tenant_id, name, name_en, name_he, price, description, description_en,
                description_he, category, subcategory, images, videos, colors,
                rating, reviews, badges, pricing_tier, mix_group_id, stock,
                created_at, updated_at
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                p.id,
                p.tenant_id,
                p.name,
                p.name_en ?? null,
                p.name_he ?? null,
                p.price,
                p.description,
                p.description_en ?? null,
                p.description_he ?? null,
                p.category,
                p.subcategory ?? null,
                JSON.stringify(p.images || []),
                JSON.stringify(p.videos || []),
                JSON.stringify(p.colors || []),
                p.rating ?? 0,
                p.reviews ?? 0,
                JSON.stringify(p.badges || []),
                p.pricingTier ?? null,
                p.mixGroupId ?? null,
                p.stock ?? 0,
                p.createdAt ?? Date.now(),
                p.updatedAt ?? Date.now(),
              ]
            );
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
