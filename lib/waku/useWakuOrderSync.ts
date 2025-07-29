import { useEffect } from 'react';
import { executeSql } from '../sqlite';
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
          const exists = await executeSql('SELECT 1 FROM users WHERE id=? LIMIT 1', [parsed.sender.id]);
          if ((exists.rows as any)._array.length === 0) return;
          if (parsed.type === 'order.update' && parsed.order) {
            const o = parsed.order;
            const tenant = await getTenant();
            await executeSql(
              `INSERT OR REPLACE INTO orders (
                id, tenant_id, user_id, total, status, payment_method,
                shipping_name, shipping_phone, shipping_street, shipping_city,
                shipping_postal_code, shipping_notes, created_at, updated_at
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                o.id,
                o.tenant_id ?? tenant,
                o.userId,
                o.total,
                o.status,
                o.paymentMethod,
                o.shippingAddress.name,
                o.shippingAddress.phone,
                o.shippingAddress.street,
                o.shippingAddress.city,
                o.shippingAddress.postalCode ?? null,
                o.shippingAddress.notes ?? null,
                o.createdAt,
                o.updatedAt,
              ]
            );
            if (o.items) {
              await executeSql('DELETE FROM order_items WHERE order_id=?', [o.id]);
              for (const item of o.items) {
                await executeSql(
                  `INSERT OR REPLACE INTO order_items (
                    id, order_id, product_id, product_name, product_image,
                    quantity, price, selected_color, created_at
                  ) VALUES (?,?,?,?,?,?,?,?,?)`,
                  [
                    item.id,
                    o.id,
                    item.productId,
                    item.product.name,
                    item.product.images[0],
                    item.quantity,
                    item.unitPrice ?? item.product.price,
                    item.selectedColor ?? null,
                    item.addedAt,
                  ]
                );
              }
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
