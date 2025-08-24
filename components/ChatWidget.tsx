import { debugLog, errorLog } from '@/utils/logger';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from './AuthContext';
import useChatRooms from '../hooks/useChatRooms';
import useChatMessages from '../hooks/useChatMessages';
import { useWakuClient } from '../hooks/useWakuClient';
import { ChatMessage } from '../types';
import SettingsAgent from '../agents/settings-agent';
import DatabaseService from '../services/database';
import RoomList from './chat/RoomList';
import MessageList from './chat/MessageList';
import MessageInput from './chat/MessageInput';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<FlatList<ChatMessage>>(null);
  const [defaultRoomId, setDefaultRoomId] = useState<string | null>(null);
  const messageSoundRef = useRef<Audio.AudioPlayer | null>(null);
  const lastTimestampRef = useRef(0);
  const isMounted = useRef(true);
  const [pinataConfigured, setPinataConfigured] = useState(true);
  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [chatConfigOk, setChatConfigOk] = useState(true);
  const waku = useWakuClient();
  const [adminKey, setAdminKey] = useState('');
  const { user, isAdmin, isDriver, isLoggedIn } = useAuth();

  const { chatRooms, setChatRooms, selectedRoom, setSelectedRoom, unreadTotal } =
    useChatRooms(isOpen);

  useEffect(() => {
    SettingsAgent.getInstance()
      .getAdmins()
      .then((a) => setAdminKey(a[0] || ''))
      .catch((err) => errorLog('Failed to load admin key', err));
  }, []);

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      if (isAdmin || isDriver) {
        loadChatRooms();
      } else if (adminKey) {
        loadOrCreateDefaultRoom();
      }
    }
  }, [isOpen, isAdmin, isDriver, isLoggedIn, adminKey]);

  useEffect(() => {
    if (isOpen) {
      isChatConfigured().then(setChatConfigOk);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      // Cleanup audio on unmount
      Object.values(playingAudio).forEach((sound) => {
        sound.remove();
      });
      if (recording) {
        recording.stop();
        // remove is not typed on AudioRecorder
        (recording as any).remove?.();
      }
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const init = async () => {
      await loadChatRooms();
      if (!isAdmin && !isDriver && adminKey) {
        const db = DatabaseService.getInstance();
        const id = await db.getOrCreateChatRoom(
          user?.id || 'guest_user',
          user?.displayName || 'Guest User',
          adminKey
        );
        setDefaultRoomId(id);
      }
    };

    init();
  }, [isLoggedIn, isAdmin, isDriver, adminKey]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!isAdmin && !isDriver && !defaultRoomId) return;

    return () => {};
  }, [isLoggedIn, isAdmin, isDriver, defaultRoomId, isOpen, selectedRoom]);

  useEffect(() => {
    const loadSound = async () => {
      try {
        const player = Audio.createAudioPlayer(
          require('../assets/sounds/message.mp3')
        );
        messageSoundRef.current = player;
      } catch (err) {
        errorLog('Failed to load message sound', err);
      }
    };
    loadSound();
    return () => {
      messageSoundRef.current?.remove();
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if ((isAdmin || isDriver) && searchQuery.trim()) {
        try {
          const db = DatabaseService.getInstance();
          const results = await db.searchUserProfiles(searchQuery.trim());
          const mapped = results.map((r) => ({
            id: r.id,
            displayName: r.displayName || r.username || r.id,
            chatPublicKey: r.chatPublicKey,
          }));
          setSearchResults(mapped);
        } catch (error) {
          errorLog('Error searching users:', error);
          setInfoModal({
            visible: true,
            title: t('errors.somethingWentWrong'),
            message: t('chat.searchFailed'),
            type: 'error',
          });
        }
      } else {
        setSearchResults([]);
      }
    };

    fetchResults();
  }, [searchQuery, isAdmin, isDriver]);

  const loadChatRooms = async () => {
    try {
      const db = DatabaseService.getInstance();
      let roomsData = await db.getChatRooms();
      if (!isAdmin && !isDriver) {
        roomsData = roomsData.filter(
          (r) => r.userId === (user?.id || 'guest_user')
        );
      }
      if (isMounted.current) {
        setChatRooms(roomsData);
      }
    } catch (error) {
      errorLog('Error loading chat rooms:', error);
      // Use default room as fallback
      if (isMounted.current) {
        setChatRooms([
          {
            id: 'default_room',
            userId: 'guest_user',
            userName: 'Guest User',
            lastMessage: 'Welcome to our store!',
            lastMessageTime: Date.now() - 3600000, // 1 hour ago
            unreadCount: 0,
          },
        ]);
      }
    }
  };

const loadOrCreateDefaultRoom = async () => {
    if (!adminKey) return;
    try {
      const db = DatabaseService.getInstance();
      const roomId = await db.getOrCreateChatRoom(
        user?.id || 'guest_user',
        user?.displayName || 'Guest User',
        adminKey
      );

      const defaultRoom = {
        id: roomId,
        userId: user?.id || 'guest_user',
        userName: user?.displayName || 'Guest User',
        lastMessage: 'Welcome to our store!',
        lastMessageTime: Date.now() - 3600000, // 1 hour ago
        unreadCount: 0,
      };

      await db.markChatRoomRead(roomId);
      const ts = await loadMessages(roomId, adminKey || '');
      lastTimestampRef.current = ts;
      if (isMounted.current) {
        setSelectedRoom(defaultRoom);
      }
      await maybeSendOnboardMessage(roomId, adminKey || '');
    } catch (error) {
      errorLog('Error creating default room:', error);
      if (isMounted.current) {
        setInfoModal({
          visible: true,
          title: 'שגיאה',
          message: "אירעה שגיאה ביצירת חדר צ'אט",
          type: 'error',
        });
      }
    }
  };

  const loadMessages = async (roomId: string, peerKey: string) => {
    try {
      const db = DatabaseService.getInstance();
      const messagesData = await db.getChatMessages(roomId);
      const decrypted = await Promise.all(
        messagesData.map(async (m) => ({
          ...m,
          message: await decryptMessage(m.message, roomId, peerKey),
        }))
      );
      if (isMounted.current) {
        setMessages(decrypted);
      }

      // Scroll to bottom after messages load
      setTimeout(() => {
        if (isMounted.current) {
          messagesEndRef.current?.scrollToOffset({ offset: 0, animated: false });
        }
      }, 100);

      return decrypted.length ? decrypted[decrypted.length - 1].timestamp : 0;
    } catch (error) {
      errorLog('Error loading messages:', error);
      // Use default welcome message as fallback
      if (isMounted.current) {
        setMessages([
          {
            id: 'default_msg',
            senderId: 'admin',
            senderName: 'Admin',
            message: 'Welcome to our store! How can I help you today?',
            timestamp: Date.now() - 3600000, // 1 hour ago
            isAdmin: true,
          },
        ]);
      }
      return 0;
    }
  };

  const maybeSendOnboardMessage = async (
    roomId: string,
    peerKey: string,
  ) => {
    if (isAdmin || isDriver) return;
    try {
      const onboarded = await AsyncStorage.getItem(CHAT_ONBOARDED_KEY);
      if (onboarded) return;
      const text = "Let's build your system. First, tell me your Game — your mission.";
      const saved = await waku.send(roomId, peerKey, {
        senderId: 'system',
        senderName: 'System',
        message: text,
        isAdmin: true,
      });
      if (isMounted.current) {
        setMessages((prev) => [...prev, saved]);
      }
      lastTimestampRef.current = saved.timestamp;
      await AsyncStorage.setItem(CHAT_ONBOARDED_KEY, 'true');
    } catch (error) {
      errorLog('Failed to send onboard message', error);
    }
  };

  const openChat = async (room: ChatRoom) => {
    const db = DatabaseService.getInstance();
    await db.markChatRoomRead(room.id);
    if (isMounted.current) {
      setChatRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r))
      );
    }
    const ts = await loadMessages(room.id, room.userPublicKey || '');
    lastTimestampRef.current = ts;
    if (isMounted.current) {
      setSelectedRoom(room);
    }
    await maybeSendOnboardMessage(room.id, room.userPublicKey || '');
  };

  useEffect(() => {
    const unsubscribe = chatAgent.onOpen(async (room) => {
      setIsOpen(true);
      await openChat(room);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    const handler = (m: ChatMessage) => {
      if (isMounted.current) {
        setMessages((prev) => [...prev, m]);
      }
      lastTimestampRef.current = m.timestamp;
    };
    let unsubscribe: (() => void) | undefined;
    waku
      .subscribe(
        selectedRoom.id,
        selectedRoom.userPublicKey || adminKey || '',
        handler,
      )
      .then((unsub) => {
        unsubscribe = unsub;
      });
    waku.fetchHistory(
      selectedRoom.id,
      selectedRoom.userPublicKey || adminKey || '',
      handler,
      lastTimestampRef.current,
    );
    return () => {
      unsubscribe?.();
    };
    }, [selectedRoom, adminKey]);

  const openSearchResult = async (result: {
    id: string;
    displayName: string;
    chatPublicKey?: string;
  }) => {
    try {
      let room = chatRooms.find((r) => r.userId === result.id);
      let roomId = room?.id;
      const db = DatabaseService.getInstance();

      if (!roomId) {
        roomId = await db.getOrCreateChatRoom(
          result.id,
          result.displayName,
          result.chatPublicKey
        );
        room = {
          id: roomId,
          userId: result.id,
          userName: result.displayName,
          lastMessage: '',
          lastMessageTime: Date.now(),
          unreadCount: 0,
        };
        if (isMounted.current) {
          setChatRooms((prev) => [room!, ...prev]);
        }
      }

      await db.markChatRoomRead(roomId);
      if (isMounted.current) {
        setChatRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r))
        );
        setSearchQuery('');
        setSearchResults([]);
      }
      const ts = await loadMessages(roomId, room?.userPublicKey || '');
      lastTimestampRef.current = ts;
      if (isMounted.current) {
        setSelectedRoom(room!);
      }
      await maybeSendOnboardMessage(roomId, room?.userPublicKey || '');
    } catch (error) {
      errorLog('Error opening chat with user:', error);
    }
  };

  const messageUser = async (id: string, name: string) => {
    setProfileModalVisible(false);
    setProfileUserId(null);
    setIsOpen(true);
    await openSearchResult({ id, displayName: name });
  };

  const ensureChatConfigured = async (): Promise<boolean> => {
    const ok = await isChatConfigured();
    if (!ok && isMounted.current) {
      setChatConfigOk(false);
      setInfoModal({
        visible: true,
        title: 'Chat unavailable',
        message: 'missing configuration',
        type: 'error',
      });
    }
    return ok;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
      if (!(await ensureChatConfigured())) return;
      setIsSending(true);

      const db = DatabaseService.getInstance();
      const roomId = selectedRoom
        ? selectedRoom.id
        : await db.getOrCreateChatRoom(
            user?.id || 'guest_user',
            user?.displayName || 'Guest User',
            adminKey
          );

    try {
      const msg: Omit<ChatMessage, 'id' | 'timestamp'> = {
        senderId: user?.id || 'user_guest',
        senderName:
          isAdmin || isDriver ? 'מנהל' : user?.displayName || 'משתמש אורח',
        message: newMessage.trim(),
        isAdmin: isAdmin || isDriver,
      };

      const peerKey = selectedRoom?.userPublicKey || adminKey || '';
      const saved = await waku.send(roomId, peerKey, msg);

      if (isMounted.current) {
        setMessages((prev) => [...prev, saved]);
        setNewMessage('');
      }
      lastTimestampRef.current = saved.timestamp;

      setTimeout(() => {
        if (isMounted.current) {
          messagesEndRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
      }, 100);
    } catch (error) {
      errorLog('Error sending message:', error);
      if (isMounted.current) {
        setInfoModal({
          visible: true,
          title: 'שגיאה',
          message: 'שליחת ההודעה נכשלה',
          type: 'error',
        });
      }
    } finally {
      if (isMounted.current) {
        setIsSending(false);
      }
    }
  };

  const startRecording = async () => {
    if (!(await ensureChatConfigured())) return;
    try {
      const configured = await MediaService.getInstance().isPinataConfigured();
      setPinataConfigured(configured);
      if (!configured) {
        if (isMounted.current) {
          setInfoModal({
            visible: true,
            title: 'שירות לא זמין',
            message: 'העלאת מדיה אינה זמינה',
            type: 'warning',
          });
        }
        return;
      }
      if (Platform.OS === 'web') {
        if (isMounted.current) {
          setInfoModal({
            visible: true,
            title: 'הודעות קוליות',
            message: 'הקלטת הודעות קוליות אינה נתמכת בגרסת הדפדפן',
            type: 'info',
          });
        }
        return;
      }

      const permission = await Audio.requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') {
        if (isMounted.current) {
          setInfoModal({
            visible: true,
            title: 'נדרשת הרשאה',
            message: 'אנא אשר הרשאת מיקרופון כדי להקליט הודעות קוליות',
            type: 'warning',
          });
        }
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const newRecording = new Audio.AudioRecorder(
        Audio.RecordingPresets.HIGH_QUALITY
      );
      newRecording.record();

      if (isMounted.current) {
        setRecording(newRecording);
        setIsRecording(true);
        setRecordingDuration(0);
      }

      // Start timer
      recordingTimer.current = setInterval(() => {
        if (isMounted.current) {
          setRecordingDuration((prev) => prev + 1);
        }
      }, 1000);
    } catch (error) {
      errorLog('Failed to start recording:', error);
      if (isMounted.current) {
        setInfoModal({
          visible: true,
          title: 'שגיאה',
          message: 'ההקלטה נכשלה',
          type: 'error',
        });
      }
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    const currentRecording = recording;
    const duration = recordingDuration;

    try {
      await currentRecording.stop();
    } catch (error) {
      errorLog('Failed to stop recording:', error);
    } finally {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      if (isMounted.current) {
        setIsRecording(false);
        setRecording(null);
        setRecordingDuration(0);
      }
    }

    try {
      if (!(await ensureChatConfigured())) {
        return;
      }
    } catch (error) {
      errorLog('Error ensuring chat configured:', error);
      if (isMounted.current) {
        setInfoModal({
          visible: true,
          title: 'Chat unavailable',
          message: 'missing configuration',
          type: 'error',
        });
      }
      return;
    }

    const uri = currentRecording.uri;
    // remove is not typed on AudioRecorder
    (currentRecording as any).remove?.();

    if (uri) {
      const pinata = PinataService.getInstance();
      const uploadedUrl = await pinata.uploadFile(uri, 'voice');
      debugLog('Voice message recorded:', uploadedUrl);

      const db = DatabaseService.getInstance();
      const roomId = selectedRoom
        ? selectedRoom.id
        : await db.getOrCreateChatRoom(
            user?.id || 'guest_user',
            user?.displayName || 'Guest User',
            adminKey
          );
      const voiceMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: user?.id || 'user_guest',
        senderName:
          isAdmin || isDriver ? 'מנהל' : user?.displayName || 'משתמש אורח',
        message: '',
        timestamp: Date.now(),
        isAdmin: isAdmin || isDriver,
        audioUri: uploadedUrl,
        audioDuration: duration,
      };

      await db.sendChatMessage(roomId, voiceMessage);
      if (isMounted.current) {
        setMessages((prev) => [...prev, voiceMessage]);
      }

      // Scroll to bottom
      setTimeout(() => {
        if (isMounted.current) {
          messagesEndRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
      }, 100);
    }
  };

  const playAudio = async (messageId: string, audioUri: string) => {
    try {
      if (Platform.OS === 'web') {
        if (isMounted.current) {
          setInfoModal({
            visible: true,
            title: 'הודעות קוליות',
            message: 'השמעת הודעות קוליות אינה נתמכת בגרסת הדפדפן',
            type: 'info',
          });
        }
        return;
      }

      // Stop any currently playing audio
      if (playingAudio[messageId]) {
        playingAudio[messageId].pause();
        playingAudio[messageId].remove();
        if (isMounted.current) {
          setPlayingAudio((prev) => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
        }
        return;
      }

      const sound = Audio.createAudioPlayer({ uri: audioUri });

      if (isMounted.current) {
        setPlayingAudio((prev) => ({ ...prev, [messageId]: sound }));
      }

      sound.play();

      sound.addListener(Audio.PLAYBACK_STATUS_UPDATE, (status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          if (isMounted.current) {
            setPlayingAudio((prev) => {
              const newState = { ...prev };
              delete newState[messageId];
              return newState;
            });
          }
          sound.remove();
        }
      });
    } catch (error) {
      errorLog('Failed to play audio:', error);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      // Update local state
      let updated: Record<string, string[]> | null = null;
      if (isMounted.current) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              const reactions = { ...(msg.reactions || {}) };
              if (!reactions[emoji]) {
                reactions[emoji] = [];
              }

              const userId = user?.id || 'guest_user';
              if (reactions[emoji].includes(userId)) {
                reactions[emoji] = reactions[emoji].filter((id) => id !== userId);
                if (reactions[emoji].length === 0) {
                  delete reactions[emoji];
                }
              } else {
                reactions[emoji].push(userId);
              }

              updated = reactions;
              return { ...msg, reactions };
            }
            return msg;
          })
        );
      }

      if (isMounted.current) {
        setShowReactions(null);
      }

      const db = DatabaseService.getInstance();
      const roomId = selectedRoom
        ? selectedRoom.id
        : await db.getOrCreateChatRoom(
            user?.id || 'guest_user',
            user?.displayName || 'Guest User',
            adminKey
          );
      if (updated) {
        await db.updateMessageReactions(messageId, updated);
      }
    } catch (error) {
      errorLog('Error adding reaction:', error);
      if (isMounted.current) {
        setShowReactions(null);
      }
    }
  };

  const navigateToUserProfile = async (userId: string) => {
    if (!isAdmin && !isDriver) return;
  };

  const {
    messages,
    newMessage,
    setNewMessage,
    sendMessage,
    loadOlderMessages,
    hasMore,
    loadingMore,
  } = useChatMessages(selectedRoom, user, isAdmin);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      loadChatRooms();
    }
  };

  if (!isLoggedIn) return null;

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.gold }]}
        onPress={toggleOpen}
      >
        <MessageCircle color={colors.text.inverse} />
        {unreadTotal > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
            <Text style={styles.unreadText}>{unreadTotal}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Modal visible={isOpen} animationType="slide">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border.primary }]}> 
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Chat</Text>
            <TouchableOpacity onPress={toggleOpen}>
              <X color={colors.text.primary} size={24} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <View style={styles.roomList}>
              <RoomList
                rooms={chatRooms}
                selectedRoom={selectedRoom}
                onSelect={setSelectedRoom}
                colors={colors}
              />
            </View>
            <View style={styles.chatArea}>
              <MessageList
                messages={messages}
                colors={colors}
                onLoadMore={loadOlderMessages}
                hasMore={hasMore}
                loadingMore={loadingMore}
              />
              <MessageInput
                value={newMessage}
                onChange={setNewMessage}
                onSend={sendMessage}
                colors={colors}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 16,
    end: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    end: 4,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  roomList: {
    width: 200,
    borderRightWidth: 1,
  },
  chatArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
});
