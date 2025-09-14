import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { LightNode, DecodedMessage, IDecoder, QueryRequestParams } from '@waku/sdk';
import { getClient } from '@/utils/transport';
import { encryptMessage, decryptMessage, encryptTopic } from '@/utils/chatCrypto';
import { enqueue, flush } from '@/utils/wakuStore';
import DatabaseService from '@/services/database';
import { ChatMessage } from '@/types';
import { verifyBeforeWrite } from '@/utils/verifyMessageSignature';
import { wakuMessageSchema } from '@/schemas/waku';
import { z } from 'zod';
import { errorLog } from '@/utils/logger';

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

interface WakuContextValue extends WakuClient {
  status: 'connecting' | 'connected' | 'disconnected';
}

const noop = async () => {};
const defaultValue: WakuContextValue = {
  status: 'disconnected',
  send: async (_r, _p, msg) => ({ ...msg, id: '', timestamp: Date.now(), message: msg.message }),
  subscribe: async () => () => {},
  fetchHistory: async () => 0,
  broadcastSystem: noop,
  subscribeSystem: async () => () => {},
  broadcastOrder: noop,
  subscribeOrders: async () => () => {},
};

const WakuContext = createContext<WakuContextValue>(defaultValue);

async function chatTopic(roomId: string, peerPublicKey: string) {
  const enc = await encryptTopic(roomId, peerPublicKey);
  return `/blue-ocean/chat/1/${enc}`;
}

const SYSTEM_TOPIC = '/blue-ocean/notifications/1';
const ORDER_TOPIC = '/blue-ocean/orders/1';

export function WakuProvider({ children }: { children: React.ReactNode }) {
  const nodeRef = useRef<LightNode>();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      const { createLightNode, waitForRemotePeer, Protocols } = await getClient();
      const node = await createLightNode({});
      node.libp2p.addEventListener('peer:disconnect', () => {
        setStatus('disconnected');
      });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Relay, Protocols.Store]);
      nodeRef.current = node;
      setStatus('connected');
      const client = await getClient();
      void flush(async (topic, payload) => {
        const encoder = client.createEncoder({ contentTopic: topic });
        await node.lightPush.send(encoder, { payload });
      });
    } catch (err) {
      errorLog('Failed to start Waku node', err);
      nodeRef.current = undefined;
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    void connect();
    return () => {
      nodeRef.current?.stop();
    };
  }, [connect]);

  useEffect(() => {
    if (status !== 'disconnected') return;
    const t = setTimeout(() => {
      void connect();
    }, 1000);
    return () => clearTimeout(t);
  }, [status, connect]);

  const send = useCallback(async (
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
    const client = await getClient();
    const topic = await chatTopic(roomId, peerPublicKey);
    const payload = client.utf8ToBytes(encrypted);
    if (nodeRef.current) {
      const encoder = client.createEncoder({ contentTopic: topic });
      await nodeRef.current.lightPush.send(encoder, { payload });
    } else {
      enqueue(topic, payload);
    }
    return full;
  }, []);

  const subscribe = useCallback(async (
    roomId: string,
    peerPublicKey: string,
    cb: (msg: ChatMessage) => void,
  ): Promise<() => void> => {
    if (!nodeRef.current) return () => {};
    const client = await getClient();
    const topic = await chatTopic(roomId, peerPublicKey);
    const decoder = client.createDecoder({ contentTopic: topic });
    const handler = async (wakuMsg: DecodedMessage) => {
      if (!wakuMsg.payload) return;
      try {
        const raw = JSON.parse(client.bytesToUtf8(wakuMsg.payload));
        const schema = wakuMessageSchema.extend({ payload: z.string() });
        const signed = await verifyBeforeWrite(raw, schema);
        if (!signed) return;
        const text = await decryptMessage(signed.payload, roomId, peerPublicKey);
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
    const maybeUnsub = (nodeRef.current.relay as any).addObserver(handler, [decoder]) as
      | (() => void)
      | void;
    return () => {
      if (typeof maybeUnsub === 'function') {
        maybeUnsub();
      } else {
        (nodeRef.current?.relay as any)?.deleteObserver?.(handler);
      }
    };
  }, []);

  const fetchHistory = useCallback(async (
    roomId: string,
    peerPublicKey: string,
    cb: (msg: ChatMessage) => void,
    after?: number,
    before?: number,
  ): Promise<number> => {
    if (!nodeRef.current) return 0;
    const client = await getClient();
    const topic = await chatTopic(roomId, peerPublicKey);
    const decoder: IDecoder<DecodedMessage> = client.createDecoder({ contentTopic: topic });
    const options: Partial<QueryRequestParams> = {};
    if (after || before) {
      if (after) options.timeStart = new Date(after + 1);
      if (before) options.timeEnd = new Date(before - 1);
    }
    let count = 0;
    for await (const page of nodeRef.current.store.queryGenerator([decoder], options)) {
      for await (const wakuMsgPromise of page) {
        const wakuMsg = await wakuMsgPromise;
        if (!wakuMsg?.payload) continue;
        try {
          const raw = JSON.parse(client.bytesToUtf8(wakuMsg.payload));
          const schema = wakuMessageSchema.extend({ payload: z.string() });
          const signed = await verifyBeforeWrite(raw, schema);
          if (!signed) continue;
          const text = await decryptMessage(signed.payload, roomId, peerPublicKey);
          const chat: ChatMessage = {
            id: Date.now().toString(),
            senderId: signed.sender.publicKey,
            senderName: signed.sender.publicKey,
            message: text,
            timestamp: wakuMsg.timestamp ? Number(wakuMsg.timestamp) : Date.now(),
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
  }, []);

  const broadcastSystem = useCallback(async (message: string) => {
    if (!nodeRef.current) return;
    const client = await getClient();
    const encoder = client.createEncoder({ contentTopic: SYSTEM_TOPIC });
    await nodeRef.current.lightPush.send(encoder, {
      payload: client.utf8ToBytes(message),
    });
  }, []);

  const broadcastOrder = useCallback(async (message: string) => {
    if (!nodeRef.current) return;
    const client = await getClient();
    const encoder = client.createEncoder({ contentTopic: ORDER_TOPIC });
    await nodeRef.current.lightPush.send(encoder, {
      payload: client.utf8ToBytes(message),
    });
  }, []);

  const subscribeSystem = useCallback(async (cb: (msg: string) => void) => {
    if (!nodeRef.current) return () => {};
    const client = await getClient();
    const decoder = client.createDecoder({ contentTopic: SYSTEM_TOPIC });
    const handler = async (wakuMsg: DecodedMessage) => {
      if (!wakuMsg.payload) return;
      try {
        const raw = JSON.parse(client.bytesToUtf8(wakuMsg.payload));
        const schema = wakuMessageSchema.extend({ payload: z.string() });
        const signed = await verifyBeforeWrite(raw, schema);
        if (!signed) {
          errorLog('Dropping unverified system message', raw);
          return;
        }
        cb(signed.payload);
      } catch (err) {
        errorLog('Malformed system message', err);
      }
    };
    const maybeUnsub = (nodeRef.current.relay as any).addObserver(handler, [decoder]) as
      | (() => void)
      | void;
    return () => {
      if (typeof maybeUnsub === 'function') {
        maybeUnsub();
      } else {
        (nodeRef.current?.relay as any)?.deleteObserver?.(handler);
      }
    };
  }, []);

  const subscribeOrders = useCallback(async (cb: (msg: string) => void) => {
    if (!nodeRef.current) return () => {};
    const client = await getClient();
    const decoder = client.createDecoder({ contentTopic: ORDER_TOPIC });
    const handler = async (wakuMsg: DecodedMessage) => {
      if (!wakuMsg.payload) return;
      try {
        const raw = JSON.parse(client.bytesToUtf8(wakuMsg.payload));
        const schema = wakuMessageSchema.extend({ payload: z.string() });
        const signed = await verifyBeforeWrite(raw, schema);
        if (!signed) {
          errorLog('Dropping unverified order message', raw);
          return;
        }
        cb(signed.payload);
      } catch (err) {
        errorLog('Malformed order message', err);
      }
    };
    const maybeUnsub = (nodeRef.current.relay as any).addObserver(handler, [decoder]) as
      | (() => void)
      | void;
    return () => {
      if (typeof maybeUnsub === 'function') {
        maybeUnsub();
      } else {
        (nodeRef.current?.relay as any)?.deleteObserver?.(handler);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      status,
      send,
      subscribe,
      fetchHistory,
      broadcastSystem,
      subscribeSystem,
      broadcastOrder,
      subscribeOrders,
    }),
    [status, send, subscribe, fetchHistory, broadcastSystem, subscribeSystem, broadcastOrder, subscribeOrders],
  );

  return <WakuContext.Provider value={value}>{children}</WakuContext.Provider>;
}

export function useWaku() {
  return useContext(WakuContext);
}

export default WakuContext;
