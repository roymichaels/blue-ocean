import { errorLog } from '@/utils/logger';
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
import { verifyBeforeWrite } from '../utils/verifyBeforeWrite';
import { wakuMessageSchema } from '../schemas/waku';
import { z } from 'zod';

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
    after?: number,
    before?: number,
  ) => Promise<number>;
  broadcastSystem: (message: string) => Promise<void>;
  subscribeSystem: (cb: (msg: string) => void) => Promise<() => void>;
  broadcastOrder: (message: string) => Promise<void>;
  subscribeOrders: (cb: (msg: string) => void) => Promise<() => void>;
}

function chatTopic(roomId: string) {
  return `/blue-ocean/chat/1/${roomId}`;
}

const SYSTEM_TOPIC = '/blue-ocean/notifications/1';
const ORDER_TOPIC = '/blue-ocean/orders/1';

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
        errorLog('Failed to start Waku node', err);
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
      try {
        const raw = JSON.parse(bytesToUtf8(wakuMsg.payload));
        const schema = wakuMessageSchema.extend({ payload: z.string() });
        const signed = await verifyBeforeWrite(raw, schema);
        if (!signed) return;
        const text = await decryptMessage(
          signed.payload,
          roomId,
          peerPublicKey,
        );
        const chat: ChatMessage = {
          id: Date.now().toString(),
          senderId: signed.sender.publicKey,
          senderName: signed.sender.publicKey,
          message: text,
          timestamp: Date.now(),
          isAdmin: false,
        };
        const db = DatabaseService.getInstance();
        await db.sendChatMessage(roomId, { ...chat, message: signed.payload });
        cb(chat);
      } catch {
        /* ignore malformed messages */
      }
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
    after?: number,
    before?: number,
  ) => {
    if (!nodeRef.current) return 0;
    const decoder = createDecoder(chatTopic(roomId));
    const options: any = { contentTopics: [chatTopic(roomId)] };
    if (after || before) {
      options.timeFilter = {};
      if (after) options.timeFilter.startTime = new Date(after + 1);
      if (before) options.timeFilter.endTime = new Date(before - 1);
    }
    let count = 0;
    for await (const msgs of nodeRef.current.store.queryGenerator(options)) {
      for (const wakuMsg of msgs.messages) {
        if (!wakuMsg.payload) continue;
        try {
          const raw = JSON.parse(bytesToUtf8(wakuMsg.payload));
          const schema = wakuMessageSchema.extend({ payload: z.string() });
          const signed = await verifyBeforeWrite(raw, schema);
          if (!signed) continue;
          const text = await decryptMessage(
            signed.payload,
            roomId,
            peerPublicKey,
          );
          const chat: ChatMessage = {
            id: Date.now().toString(),
            senderId: signed.sender.publicKey,
            senderName: signed.sender.publicKey,
            message: text,
            timestamp: wakuMsg.timestamp
              ? Number(wakuMsg.timestamp)
              : Date.now(),
            isAdmin: false,
          };
          const db = DatabaseService.getInstance();
          await db.sendChatMessage(roomId, { ...chat, message: signed.payload });
          cb(chat);
          count += 1;
        } catch {
          /* ignore malformed messages */
        }
      }
    }
    return count;
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
