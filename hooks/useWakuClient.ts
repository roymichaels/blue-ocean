import { useEffect, useRef } from 'react';
import {
  LightNode,
  createLightNode,
  waitForRemotePeer,
  createEncoder,
  createDecoder,
  Protocols,
  bytesToUtf8,
  utf8ToBytes,
} from '@waku/sdk';
import { encryptMessage, decryptMessage } from '../utils/chatCrypto';
import DatabaseService from '../services/database';
import { ChatMessage } from '../types';
import { getWakuBootstrapNodes } from '../utils/appConfig';

const DEFAULT_BOOTSTRAP =
  '/dns4/node.waku.nodes.status.im/tcp/443/wss/p2p/16Uiu2HAmSWvkpawuUxEe7dBDEu79SU1YEYTbSsfXrVvjJAnGqsRP';

export interface WakuClient {
  send: (
    roomId: string,
    peerPublicKey: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>,
  ) => Promise<ChatMessage>;
  subscribe: (
    roomId: string,
    peerPublicKey: string,
    callback: (msg: ChatMessage) => void,
  ) => Promise<() => void>;
  fetchHistory: (
    roomId: string,
    peerPublicKey: string,
    callback: (msg: ChatMessage) => void,
  ) => Promise<void>;
  broadcastSystem: (message: string) => Promise<void>;
  subscribeSystem: (cb: (msg: string) => void) => Promise<() => void>;
  broadcastOrder: (message: string) => Promise<void>;
  subscribeOrders: (cb: (msg: string) => void) => Promise<() => void>;
}

function chatTopic(roomId: string) {
  return `/congress/chat/1/${roomId}`;
}

const SYSTEM_TOPIC = '/congress/notifications/1';
const ORDER_TOPIC = '/congress/orders/1';

export function useWakuClient(): WakuClient {
  const nodeRef = useRef<LightNode>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let node: LightNode | undefined;
      try {
        const bootstrap = getWakuBootstrapNodes();
        if (bootstrap.length === 0) bootstrap.push(DEFAULT_BOOTSTRAP);
        node = await createLightNode({
          libp2p: { bootstrap },
        });
        await node.start();
        await waitForRemotePeer(node, [Protocols.Relay, Protocols.Store]);
        if (!cancelled) nodeRef.current = node;
      } catch (err) {
        console.error('Failed to start Waku node', err);
        if (node) {
          try {
            await node.stop();
          } catch (_) {
            // ignore
          }
        }
      }
    })();
    return () => {
      cancelled = true;
      nodeRef.current?.stop();
    };
  }, []);

  const send = async (
    roomId: string,
    peerPublicKey: string,
    msg: Omit<ChatMessage, 'id' | 'timestamp'>,
  ): Promise<ChatMessage> => {
    const db = DatabaseService.getInstance();
    const encrypted = await encryptMessage(msg.message, roomId, peerPublicKey);
    const full: ChatMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...msg,
      message: msg.message,
    };
    await db.sendChatMessage(roomId, { ...full, message: encrypted });

    if (nodeRef.current) {
      const encoder = createEncoder({ contentTopic: chatTopic(roomId) });
      await nodeRef.current.lightPush.send(encoder, {
        payload: utf8ToBytes(encrypted),
      });
    }
    return full;
  };

  const subscribe = async (
    roomId: string,
    peerPublicKey: string,
    cb: (msg: ChatMessage) => void,
  ): Promise<() => void> => {
    if (!nodeRef.current) return () => {};
    const decoder = createDecoder(chatTopic(roomId));
    const handler = async (wakuMsg: any) => {
      if (!wakuMsg.payload) return;
      const encrypted = bytesToUtf8(wakuMsg.payload);
      const text = await decryptMessage(encrypted, roomId, peerPublicKey);
      const chat: ChatMessage = {
        id: Date.now().toString(),
        senderId: wakuMsg.meta?.sender || 'peer',
        senderName: wakuMsg.meta?.sender || 'peer',
        message: text,
        timestamp: Date.now(),
        isAdmin: false,
      };
      const db = DatabaseService.getInstance();
      await db.sendChatMessage(roomId, { ...chat, message: encrypted });
      cb(chat);
    };
    const maybeUnsub = (nodeRef.current.relay as any).addObserver(
      handler,
      [decoder],
    ) as (() => void) | void;

    return () => {
      if (typeof maybeUnsub === 'function') {
        maybeUnsub();
      } else {
        (nodeRef.current?.relay as any)?.deleteObserver?.(handler);
      }
    };
  };

  const fetchHistory = async (
    roomId: string,
    peerPublicKey: string,
    cb: (msg: ChatMessage) => void,
  ) => {
    if (!nodeRef.current) return;
    const decoder = createDecoder(chatTopic(roomId));
    for await (const msgs of nodeRef.current.store.queryGenerator({
      contentTopics: [chatTopic(roomId)],
    })) {
      for (const wakuMsg of msgs.messages) {
        if (!wakuMsg.payload) continue;
        const encrypted = bytesToUtf8(wakuMsg.payload);
        const text = await decryptMessage(encrypted, roomId, peerPublicKey);
        const chat: ChatMessage = {
          id: Date.now().toString(),
          senderId: wakuMsg.meta?.sender || 'peer',
          senderName: wakuMsg.meta?.sender || 'peer',
          message: text,
          timestamp: wakuMsg.timestamp ? Number(wakuMsg.timestamp) : Date.now(),
          isAdmin: false,
        };
        const db = DatabaseService.getInstance();
        await db.sendChatMessage(roomId, { ...chat, message: encrypted });
        cb(chat);
      }
    }
  };

  const broadcastSystem = async (message: string) => {
    if (!nodeRef.current) return;
    const encoder = createEncoder({ contentTopic: SYSTEM_TOPIC });
    await nodeRef.current.lightPush.send(encoder, { payload: utf8ToBytes(message) });
  };

  const broadcastOrder = async (message: string) => {
    if (!nodeRef.current) return;
    const encoder = createEncoder({ contentTopic: ORDER_TOPIC });
    await nodeRef.current.lightPush.send(encoder, { payload: utf8ToBytes(message) });
  };

  const subscribeSystem = async (cb: (msg: string) => void) => {
    if (!nodeRef.current) return () => {};
    const decoder = createDecoder(SYSTEM_TOPIC);
    const handler = (wakuMsg: any) => {
      if (!wakuMsg.payload) return;
      cb(bytesToUtf8(wakuMsg.payload));
    };
    const maybeUnsub = (nodeRef.current.relay as any).addObserver(
      handler,
      [decoder],
    ) as (() => void) | void;
    return () => {
      if (typeof maybeUnsub === 'function') {
        maybeUnsub();
      } else {
        (nodeRef.current?.relay as any)?.deleteObserver?.(handler);
      }
    };
  };

  const subscribeOrders = async (cb: (msg: string) => void) => {
    if (!nodeRef.current) return () => {};
    const decoder = createDecoder(ORDER_TOPIC);
    const handler = (wakuMsg: any) => {
      if (!wakuMsg.payload) return;
      cb(bytesToUtf8(wakuMsg.payload));
    };
    const maybeUnsub = (nodeRef.current.relay as any).addObserver(
      handler,
      [decoder],
    ) as (() => void) | void;
    return () => {
      if (typeof maybeUnsub === 'function') {
        maybeUnsub();
      } else {
        (nodeRef.current?.relay as any)?.deleteObserver?.(handler);
      }
    };
  };

  return {
    send,
    subscribe,
    fetchHistory,
    broadcastSystem,
    subscribeSystem,
    broadcastOrder,
    subscribeOrders,
  };
}
