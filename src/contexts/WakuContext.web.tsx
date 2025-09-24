import React, { createContext, useContext } from 'react';
import { encryptMessage } from '@/utils/chatCrypto';
import DatabaseService from '@/services/database';
import { ChatMessage } from '@/types';

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
  broadcastNotification: (message: string) => Promise<void>;
  subscribeNotifications: (cb: (msg: string) => void) => Promise<() => void>;
}

interface WakuContextValue extends WakuClient {
  status: 'connecting' | 'connected' | 'disconnected';
}

const defaultValue: WakuContextValue = {
  status: 'disconnected',
  send: async (roomId, peerPublicKey, msg) => {
    const db = DatabaseService.getInstance();
    const encrypted = await encryptMessage(msg.message, roomId, peerPublicKey);
    const full: ChatMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...msg,
      message: msg.message,
    };
    await db.sendChatMessage(roomId, { ...full, message: encrypted });
    return full;
  },
  subscribe: async () => () => {},
  fetchHistory: async () => 0,
  broadcastSystem: async () => {},
  subscribeSystem: async () => () => {},
  broadcastNotification: async () => {},
  subscribeNotifications: async () => () => {},
};

const WakuContext = createContext<WakuContextValue>(defaultValue);

export function WakuProvider({ children }: { children: React.ReactNode }) {
  return <WakuContext.Provider value={defaultValue}>{children}</WakuContext.Provider>;
}

export function useWaku() {
  return useContext(WakuContext);
}

export default WakuContext;
