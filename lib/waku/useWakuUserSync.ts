import { useEffect } from 'react';
import { executeSql } from '../sqlite';
import { TENANT } from '../../constants/tenant';

export const useWakuUserSync = () => {
  useEffect(() => {
    const run = async () => {
      const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Store, Protocols.LightPush]);

      const decoder = node.createDecoder({ contentTopic: '/congress/users/1' });
      await node.filter!.subscribe(decoder, async (msg) => {
        if (!msg.payload) return;
        const decoded = new TextDecoder().decode(msg.payload);
        try {
          const parsed = JSON.parse(decoded);
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
  }, []);
};
