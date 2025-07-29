import { useEffect } from 'react';
import { Buffer } from 'buffer';
import { executeSql } from '../sqlite';
import { decryptWakuPayload } from './wakuCrypto';
import { requireConfig } from '../../utils/env';

export const useWakuSettingsSync = () => {
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

      const topic = '/congress/settings/1/proto';
      decoder = node.createDecoder({ contentTopic: topic });
      await node.filter!.subscribe(decoder, async (msg) => {
        if (!msg.payload) return;
        const decoded = new TextDecoder().decode(msg.payload);
        const plaintext = await decryptWakuPayload(decoded);
        const hashBuffer = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(plaintext),
        );
        const id = Buffer.from(new Uint8Array(hashBuffer)).toString('hex');

        const seen = await executeSql(
          'SELECT 1 FROM waku_seen WHERE id=? AND topic=? LIMIT 1',
          [id, topic],
        );
        if ((seen.rows as any)._array.length > 0) return;

        await executeSql('INSERT INTO waku_seen (id, topic) VALUES (?, ?)', [id, topic]);
        try {
          const parsed = JSON.parse(plaintext);
          if (!parsed.signature || !parsed.sender?.publicKey) {
            return;
          }
          const verifyObj = {
            type: parsed.type,
            key: parsed.key,
            value: parsed.value,
            createdAt: parsed.createdAt,
            updatedAt: parsed.updatedAt,
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
          if (parsed.type === 'settings.update') {
            await executeSql(
              `INSERT INTO settings (key,value,created_at,updated_at)
               VALUES (?,?,?,?)
               ON CONFLICT(key) DO UPDATE SET
                 value=excluded.value,
                 updated_at=excluded.updated_at`,
              [parsed.key, parsed.value, parsed.createdAt, parsed.updatedAt]
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
