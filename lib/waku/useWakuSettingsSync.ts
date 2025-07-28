import { useEffect } from 'react';
import { executeSql } from '../sqlite';

export const useWakuSettingsSync = () => {
  useEffect(() => {
    const run = async () => {
      const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Store, Protocols.LightPush]);

      const topic = '/congress/settings/1';
      const decoder = node.createDecoder({ contentTopic: topic });
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
          if (parsed.type === 'settings.update') {
            await executeSql(
              'INSERT OR REPLACE INTO settings (key,value) VALUES (?, ?)',
              [parsed.key, parsed.value]
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
