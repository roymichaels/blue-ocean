import { useEffect } from 'react';
import { executeSql } from '../sqlite';

export const useWakuSettingsSync = () => {
  useEffect(() => {
    const run = async () => {
      const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Store, Protocols.LightPush]);

      const decoder = node.createDecoder({ contentTopic: '/congress/settings/1' });
      await node.filter!.subscribe(decoder, async (msg) => {
        if (!msg.payload) return;
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
