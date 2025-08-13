import { errorLog } from '@/utils/logger';
import { useState, useEffect } from 'react';
import DatabaseService from '../services/database';
import { ChatMessage, ChatRoom, User } from '../types';

export function useChatMessages(selectedRoom: ChatRoom | null, user: User | null | undefined, isAdmin: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
    } else {
      setMessages([]);
    }
  }, [selectedRoom?.id]);

  const loadMessages = async (roomId: string) => {
    try {
      const db = DatabaseService.getInstance();
      const msgs = await db.getChatMessages(roomId);
      setMessages(msgs);
    } catch (err) {
      errorLog('Failed to load messages', err);
    }
  };

  const sendMessage = async () => {
    if (!selectedRoom || !user || !newMessage.trim()) return;
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      senderName: user.displayName || 'User',
      message: newMessage,
      timestamp: Date.now(),
      isAdmin,
    };
    try {
      const db = DatabaseService.getInstance();
      await db.sendChatMessage(selectedRoom.id, msg);
      setMessages((prev) => [...prev, msg]);
      setNewMessage('');
    } catch (err) {
      errorLog('Failed to send message', err);
    }
  };

  return { messages, newMessage, setNewMessage, sendMessage };
}
export default useChatMessages;
