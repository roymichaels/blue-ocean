import { encryptMessage } from '../utils/chatCrypto';
import DatabaseService from '../services/database';
import { ChatMessage } from '../types';

export function useWakuClient() {
  return {
    send: async (
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
      return full;
    },
    subscribe: async () => () => {},
    fetchHistory: async () => {},
  };
}
