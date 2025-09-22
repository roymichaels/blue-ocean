import { errorLog } from '@/utils/logger';
import { useState, useEffect, useMemo, useCallback } from 'react';
import DatabaseService from '@/services/database';
import { ChatMessage, ChatRoom, User } from '@/types';
import { useWaku } from '@/contexts/WakuContext';

export function useChatMessages(selectedRoom: ChatRoom | null, user: User | null | undefined, isAdmin: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const waku = useWaku();

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const db = DatabaseService.getInstance();
      const msgs = await db.getChatMessages(roomId);
      setMessages(msgs);
      setHasMore(true);
    } catch (err) {
      errorLog('Failed to load messages', err);
    }
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
    } else {
      setMessages([]);
    }
  }, [selectedRoom?.id, loadMessages]);

  const sendMessage = useCallback(async () => {
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
  }, [selectedRoom, user, newMessage, isAdmin]);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedRoom || loadingMore || !hasMore) return;
    const oldest = messages[0]?.timestamp;
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const fetched = await waku.fetchHistory(
        selectedRoom.id,
        selectedRoom.userPublicKey || '',
        (msg) => {
          setMessages((prev) => [msg, ...prev]);
        },
        undefined,
        oldest - 1,
      );
      if (fetched === 0) setHasMore(false);
    } catch (err) {
      errorLog('Failed to load older messages', err);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedRoom, loadingMore, hasMore, messages, waku]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.timestamp - b.timestamp),
    [messages],
  );

  return {
    messages: sortedMessages,
    newMessage,
    setNewMessage,
    sendMessage,
    loadOlderMessages,
    hasMore,
    loadingMore,
    setMessages,
  };
}
export default useChatMessages;
