import { useState, useEffect } from 'react';
import DatabaseService from '../services/database';
import { ChatRoom } from '../types';

export function useChatRooms(isOpen: boolean) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const loadChatRooms = async () => {
    try {
      const db = DatabaseService.getInstance();
      const rooms = await db.getChatRooms();
      setChatRooms(rooms);
    } catch (err) {
      console.error('Failed to load chat rooms', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadChatRooms();
    }
  }, [isOpen]);

  useEffect(() => {
    setUnreadTotal(chatRooms.reduce((sum, r) => sum + r.unreadCount, 0));
  }, [chatRooms]);

  return { chatRooms, selectedRoom, setSelectedRoom, loadChatRooms, unreadTotal };
}
export default useChatRooms;
