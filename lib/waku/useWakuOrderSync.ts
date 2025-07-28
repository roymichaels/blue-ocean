import { useEffect } from 'react';
import { executeSql } from '../sqlite';
import { TENANT } from '../../constants/tenant';
import { sha256 } from '@noble/hashes/sha256';

export const useWakuOrderSync = () => {
  useEffect(() => {
    let node: any;
    let decoder: any;

    const run = async () => {
      const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
      const { verify, etc: edBytes } = await import('@noble/ed25519');
      node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Store, Protocols.LightPush]);

      decoder = node.createDecoder({ contentTopic: '/congress/orders/1' });
      await node.filter!.subscribe(decoder, async (msg) => {
        if (!msg.payload) return;
        const decoded = new TextDecoder().decode(msg.payload);
        try {
          const parsed = JSON.parse(decoded);
          if (!parsed.signature || !parsed.sender) return;
          const { signature, ...unsigned } = parsed;
          const payloadStr = JSON.stringify(unsigned);
          const hash = sha256(new TextEncoder().encode(payloadStr));
          const valid = await verify(
            edBytes.hexToBytes(signature),
            hash,
            edBytes.hexToBytes(parsed.sender.publicKey),
          );
          if (!valid || parsed.sender.role !== 'admin') {
            return;
          }
          const exists = await executeSql('SELECT 1 FROM users WHERE id=? LIMIT 1', [parsed.sender.id]);
          if ((exists.rows as any)._array.length === 0) return;
          if (parsed.type === 'order.update' && parsed.order) {
            const o = parsed.order;
            await executeSql(
              `INSERT OR REPLACE INTO orders (
                id, tenant_id, user_id, total, status, payment_method,
                shipping_name, shipping_phone, shipping_street, shipping_city,
                shipping_postal_code, shipping_notes, created_at, updated_at
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                o.id,
                o.tenant_id ?? TENANT,
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
