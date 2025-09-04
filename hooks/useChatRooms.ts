import { errorLog } from '@/utils/logger';
import { useState, useEffect, useMemo, useCallback } from 'react';
import DatabaseService from '@/services/database';
import { ChatRoom } from '../types';

export function useChatRooms(isOpen: boolean) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);

  const loadChatRooms = useCallback(async () => {
    try {
      const db = DatabaseService.getInstance();
      const rooms = await db.getChatRooms();
      setChatRooms(rooms);
    } catch (err) {
      errorLog('Failed to load chat rooms', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadChatRooms();
    }
  }, [isOpen, loadChatRooms]);

  const unreadTotal = useMemo(
    () => chatRooms.reduce((sum, r) => sum + r.unreadCount, 0),
    [chatRooms],
  );

  return {
    chatRooms,
    setChatRooms,
    selectedRoom,
    setSelectedRoom,
    loadChatRooms,
    unreadTotal,
  };
}
export default useChatRooms;
