import type { LightNode } from '@waku/sdk';

let nodePromise: Promise<LightNode> | null = null;

export async function getNode(): Promise<LightNode> {
  if (!nodePromise) {
    nodePromise = (async () => {
      const { createLightNode, waitForRemotePeer, Protocols } = await import('@waku/sdk');
      const n = await createLightNode({
        defaultBootstrap: true,
        libp2p: { hideWebSocketInfo: true },
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
