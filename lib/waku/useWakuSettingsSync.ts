import { useEffect } from 'react';
import { executeSql } from '../sqlite';

export const useWakuSettingsSync = () => {
  useEffect(() => {
    let node: any;
    let decoder: any;

    const run = async () => {
      const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
      const { sha256 } = await import('@noble/hashes/sha256');
      const ed = await import('@noble/ed25519');
      node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Store, Protocols.LightPush]);

      const topic = '/congress/settings/1';
      decoder = node.createDecoder({ contentTopic: topic });
      await node.filter!.subscribe(decoder, async (msg) => {
        if (!msg.payload || !msg.timestamp) return;
        const id = msg.timestamp.getTime().toString();

        const seen = await executeSql(
          'SELECT 1 FROM waku_seen WHERE id=? AND topic=? LIMIT 1',
          [id, topic]
        );
        if ((seen.rows as any)._array.length > 0) return;

        await executeSql('INSERT INTO waku_seen (id, topic) VALUES (?, ?)', [id, topic]);

        const decoded = new TextDecoder().decode(msg.payload);
        try {
          const parsed = JSON.parse(decoded);
          const { sender, signature, ...rest } = parsed;
          if (!sender?.publicKey || !signature) return;
          const hash = sha256(new TextEncoder().encode(JSON.stringify(rest)));
          const ok = await ed.verify(
            Uint8Array.from(Buffer.from(signature, 'hex')),
            hash,
            Uint8Array.from(Buffer.from(sender.publicKey, 'hex'))
          );
          if (!ok) return;
          if (rest.type === 'settings.update') {
            await executeSql(
              `INSERT INTO settings (key,value,created_at,updated_at)
               VALUES (?,?,?,?)
               ON CONFLICT(key) DO UPDATE SET
                 value=excluded.value,
                 updated_at=excluded.updated_at`,
              [rest.key, rest.value, rest.createdAt, rest.updatedAt]
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
