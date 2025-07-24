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

const USE_WAKU = process.env.EXPO_PUBLIC_USE_WAKU === 'true';
const BOOTSTRAP =
  '/dns4/node.waku.nodes.status.im/tcp/443/wss/p2p/16Uiu2HAmSWvkpawuUxEe7dBDEu79SU1YEYTbSsfXrVvjJAnGqsRP';

export interface WakuClient {
  send: (
    roomId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>,
  ) => Promise<ChatMessage>;
  subscribe: (
    roomId: string,
    callback: (msg: ChatMessage) => void,
  ) => Promise<void>;
  fetchHistory: (
    roomId: string,
    callback: (msg: ChatMessage) => void,
  ) => Promise<void>;
}

function topic(roomId: string) {
  return `/blue-ocean/1/chat/${roomId}/proto`;
}

export function useWakuClient(): WakuClient {
  const nodeRef = useRef<LightNode>();

  useEffect(() => {
    if (!USE_WAKU) return;
    let cancelled = false;
    (async () => {
      const node = await createLightNode({
        libp2p: { bootstrap: [BOOTSTRAP] },
      });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Relay, Protocols.Store]);
      if (!cancelled) nodeRef.current = node;
    })();
    return () => {
      cancelled = true;
      nodeRef.current?.stop();
    };
  }, []);

  const send = async (
    roomId: string,
    msg: Omit<ChatMessage, 'id' | 'timestamp'>,
  ): Promise<ChatMessage> => {
    const db = DatabaseService.getInstance();
    const encrypted = await encryptMessage(msg.message, roomId);
    const full: ChatMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...msg,
      message: msg.message,
    };
    await db.sendChatMessage(roomId, { ...full, message: encrypted });

    if (USE_WAKU && nodeRef.current) {
      const encoder = createEncoder({ contentTopic: topic(roomId) });
      await nodeRef.current.lightPush.push(encoder, {
        payload: utf8ToBytes(encrypted),
      });
    }
    return full;
  };

  const subscribe = async (
    roomId: string,
    cb: (msg: ChatMessage) => void,
  ) => {
    if (!USE_WAKU || !nodeRef.current) return;
    const decoder = createDecoder(topic(roomId));
    const handler = async (wakuMsg: any) => {
      if (!wakuMsg.payload) return;
      const encrypted = bytesToUtf8(wakuMsg.payload);
      const text = await decryptMessage(encrypted, roomId);
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
    nodeRef.current.relay.addObserver(handler, [decoder]);
  };

  const fetchHistory = async (
    roomId: string,
    cb: (msg: ChatMessage) => void,
  ) => {
    if (!USE_WAKU || !nodeRef.current) return;
    const decoder = createDecoder(topic(roomId));
    for await (const msgs of nodeRef.current.store.queryGenerator({
      contentTopics: [topic(roomId)],
    })) {
      for (const wakuMsg of msgs.messages) {
        if (!wakuMsg.payload) continue;
        const encrypted = bytesToUtf8(wakuMsg.payload);
        const text = await decryptMessage(encrypted, roomId);
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

  return { send, subscribe, fetchHistory };
}
