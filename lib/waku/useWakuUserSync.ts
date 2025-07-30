import { useEffect } from 'react';
import { store } from '../memoryStore';
import { decryptWakuPayload } from './wakuCrypto';
import { getTenant } from '../../constants/tenant';
import config from '../../utils/appConfig';

export const useWakuUserSync = () => {
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

      decoder = node.createDecoder({ contentTopic: '/congress/users/1/proto' });
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
            user: parsed.user,
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
          if (parsed.type === 'user.update' && parsed.user) {
            const u = parsed.user;
            const tenant = await getTenant();
            const updated = {
              ...u,
              tenant_id: u.tenant_id ?? tenant,
              role: u.role ?? (u.isAdmin ? 'admin' : u.isDriver ? 'driver' : 'user'),
              createdAt: u.createdAt ?? new Date().toISOString(),
              updatedAt: u.updatedAt ?? new Date().toISOString(),
              kycStatus: u.kycStatus ?? 'none',
              customerTier: u.customerTier ?? 'new',
              kycRequestNotes: u.kycRequestNotes ?? null,
              kycRequestedAt: u.kycRequestedAt ?? null,
              kycApprovedBy: u.kycApprovedBy ?? null,
              kycApprovedAt: u.kycApprovedAt ?? null,
            };
            const idx = store.users.findIndex((usr) => usr.id === u.id);
            if (idx >= 0) {
              store.users[idx] = updated as any;
            } else {
              store.users.push(updated as any);
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
