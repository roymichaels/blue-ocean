import { createLightNode, waitForRemotePeer, Protocols, type LightNode } from '@waku/sdk';
import { getWakuBootstrapNodes } from '../../utils/appConfig';

let nodePromise: Promise<LightNode> | null = null;

export async function getNode(): Promise<LightNode> {
  if (!nodePromise) {
    nodePromise = (async () => {
      const bootstrap = getWakuBootstrapNodes();
      const n = await createLightNode({
        ...(bootstrap.length === 0 ? { defaultBootstrap: true } : {}),
        libp2p: {
          hideWebSocketInfo: true,
          ...(bootstrap.length ? { bootstrap } : {}),
        },
      });
      await n.start();
      await waitForRemotePeer(n, [Protocols.LightPush]);
      return n;
    })();
  }
  return nodePromise;
}

export async function stopNode(): Promise<void> {
  if (nodePromise) {
    const n = await nodePromise;
    await n.stop();
    nodePromise = null;
  }
}
