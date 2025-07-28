import { useEffect } from 'react';
import { executeSql } from '../sqlite';
import { decryptWakuPayload } from './wakuCrypto';
import { TENANT } from '../../constants/tenant';

export const useWakuUserSync = () => {
  useEffect(() => {
    let node: any;
    let decoder: any;

    const run = async () => {
      const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
      node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Store, Protocols.LightPush]);

      decoder = node.createDecoder({ contentTopic: '/congress/users/1' });
      await node.filter!.subscribe(decoder, async (msg) => {
        if (!msg.payload) return;
        const decoded = new TextDecoder().decode(msg.payload);
        const plaintext = await decryptWakuPayload(decoded);
        try {
          const parsed = JSON.parse(plaintext);
          if (!parsed.sender || parsed.sender.role !== 'admin') {
            return;
          }
          const exists = await executeSql('SELECT 1 FROM users WHERE id=? LIMIT 1', [parsed.sender.id]);
          if ((exists.rows as any)._array.length === 0) return;
          if (parsed.type === 'user.update' && parsed.user) {
            const u = parsed.user;
            await executeSql(
              `INSERT OR REPLACE INTO user_profiles (
                id, tenant_id, matrix_user_id, app_username, email, display_name,
                role, created_at, updated_at, kyc_status, customer_tier,
                kyc_request_notes, kyc_requested_at, kyc_approved_by, kyc_approved_at
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                u.id,
                u.tenant_id ?? TENANT,
                u.id,
                u.username,
                u.email ?? null,
                u.displayName,
                u.role ?? (u.isAdmin ? 'admin' : u.isDriver ? 'driver' : 'user'),
                u.createdAt ?? new Date().toISOString(),
                u.updatedAt ?? new Date().toISOString(),
                u.kycStatus ?? 'none',
                u.customerTier ?? 'new',
                u.kycRequestNotes ?? null,
                u.kycRequestedAt ?? null,
                u.kycApprovedBy ?? null,
                u.kycApprovedAt ?? null,
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
