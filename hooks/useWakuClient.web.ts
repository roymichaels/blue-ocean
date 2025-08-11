import { encryptMessage } from '../utils/chatCrypto';
import DatabaseService from '../services/database';
import { ChatMessage } from '../types';

export function useWakuClient() {
  return {
    send: async (
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
      return full;
    },
    subscribe: async (
      _roomId: string,
      _peerPublicKey: string,
      _cb: (msg: ChatMessage) => void,
    ) => () => {},
    fetchHistory: async (
      _roomId: string,
      _peerPublicKey: string,
      _cb: (msg: ChatMessage) => void,
    ) => {},
    broadcastSystem: async (_msg: string) => {},
    subscribeSystem: async (_cb: (msg: string) => void) => () => {},
    broadcastOrder: async (_msg: string) => {},
    subscribeOrders: async (_cb: (msg: string) => void) => () => {},
  };
}
