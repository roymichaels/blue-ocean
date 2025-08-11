import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  Search,
  ChevronLeft,
  Mic,
  MicOff,
  Play,
  Pause,
} from 'lucide-react-native';
import * as Audio from 'expo-audio';
// MatrixService has been removed
import DatabaseService from '../services/database';
import PinataService from '../services/pinata';
import MediaService from '../services/media';
import { debugLog } from '../utils/logger';
import { ChatMessage, ChatRoom, User } from '../types';
import { decryptMessage } from '../utils/chatCrypto';
import { useWakuClient } from '../hooks/useWakuClient';
import { useAuth } from './AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { isChatConfigured } from '../services/chatConfig';
import InfoModal from './InfoModal';
import UserProfileModal from './UserProfileModal';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const CHAT_ONBOARDED_KEY = 'chatOnboarded';


export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.AudioRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<{
    [key: string]: Audio.AudioPlayer;
  }>({});
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    { id: string; displayName: string; isAppUser: boolean }[]
  >([]);
  const { isAdmin, isDriver, isLoggedIn, user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<ScrollView>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [defaultRoomId, setDefaultRoomId] = useState<string | null>(null);
  const messageSoundRef = useRef<Audio.AudioPlayer | null>(null);
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

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      if (isAdmin || isDriver) {
        loadChatRooms();
      } else {
        loadOrCreateDefaultRoom();
      }
    }
  }, [isOpen, isAdmin, isDriver, isLoggedIn]);

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
      if (!isAdmin && !isDriver) {
        const db = DatabaseService.getInstance();
        const id = await db.getOrCreateChatRoom(
          user?.id || 'guest_user',
          user?.displayName || 'Guest User',
          config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY
        );
        setDefaultRoomId(id);
      }
    };

    init();
  }, [isLoggedIn, isAdmin, isDriver]);

  useEffect(() => {
    setUnreadTotal(chatRooms.reduce((sum, r) => sum + r.unreadCount, 0));
  }, [chatRooms]);

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
        console.error('Failed to load message sound', err);
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
          const mapped = results.map((r: any) => ({
            id: r.matrix_user_id,
            displayName: r.display_name || r.app_username || r.matrix_user_id,
            isAppUser: true,
          }));
          setSearchResults(mapped);
        } catch (error) {
          console.error('Error searching users:', error);
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
      console.error('Error loading chat rooms:', error);
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
    try {
      const db = DatabaseService.getInstance();
      const roomId = await db.getOrCreateChatRoom(
        user?.id || 'guest_user',
        user?.displayName || 'Guest User',
        config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY
      );

      const defaultRoom = {
        id: roomId,
        userId: user?.id || 'guest_user',
        userName: user?.displayName || 'Guest User',
        lastMessage: 'Welcome to our store!',
        lastMessageTime: Date.now() - 3600000, // 1 hour ago
        unreadCount: 0,
      };

      if (isMounted.current) {
        setSelectedRoom(defaultRoom);
      }
      await db.markChatRoomRead(roomId);
      await loadMessages(
        roomId,
        config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY || '',
      );
      await maybeSendOnboardMessage(
        roomId,
        config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY || '',
      );
    } catch (error) {
      console.error('Error creating default room:', error);
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
          messagesEndRef.current?.scrollToEnd({ animated: false });
        }
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
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
      await AsyncStorage.setItem(CHAT_ONBOARDED_KEY, 'true');
    } catch (error) {
      console.error('Failed to send onboard message', error);
    }
  };

  const openChat = async (room: ChatRoom) => {
    if (isMounted.current) {
      setSelectedRoom(room);
    }
    const db = DatabaseService.getInstance();
    await db.markChatRoomRead(room.id);
    if (isMounted.current) {
      setChatRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r))
      );
    }
    await loadMessages(room.id, room.userPublicKey || '');
    await maybeSendOnboardMessage(room.id, room.userPublicKey || '');
  };

  useEffect(() => {
    if (!selectedRoom) return;
    const handler = (m: ChatMessage) => {
      if (isMounted.current) {
        setMessages((prev) => [...prev, m]);
      }
    };
    let unsubscribe: (() => void) | undefined;
    waku
      .subscribe(
        selectedRoom.id,
        selectedRoom.userPublicKey || config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY || '',
        handler,
      )
      .then((unsub) => {
      unsubscribe = unsub;
    });
    waku.fetchHistory(
      selectedRoom.id,
      selectedRoom.userPublicKey || config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY || '',
      handler,
    );
    return () => {
      unsubscribe?.();
    };
  }, [selectedRoom]);

  const openSearchResult = async (result: {
    id: string;
    displayName: string;
    isAppUser: boolean;
  }) => {
    try {
      let room = chatRooms.find((r) => r.userId === result.id);
      let roomId = room?.id;

      if (!roomId) {
        const db = DatabaseService.getInstance();
        roomId = await db.getOrCreateChatRoom(
          result.id,
          result.displayName,
          (result as any).chatPublicKey
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

      if (isMounted.current) {
        setSelectedRoom(room!);
      }
      const db = DatabaseService.getInstance();
      await db.markChatRoomRead(roomId);
      if (isMounted.current) {
        setChatRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r))
        );
        setSearchQuery('');
        setSearchResults([]);
      }
      await loadMessages(roomId, room?.userPublicKey || '');
      await maybeSendOnboardMessage(roomId, room?.userPublicKey || '');
    } catch (error) {
      console.error('Error opening chat with user:', error);
    }
  };

  const messageUser = async (id: string, name: string) => {
    setProfileModalVisible(false);
    setProfileUserId(null);
    setIsOpen(true);
    await openSearchResult({ id, displayName: name, isAppUser: true });
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
          config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY
        );

    try {
      const msg: Omit<ChatMessage, 'id' | 'timestamp'> = {
        senderId: user?.id || 'user_guest',
        senderName:
          isAdmin || isDriver ? 'מנהל' : user?.displayName || 'משתמש אורח',
        message: newMessage.trim(),
        isAdmin: isAdmin || isDriver,
      };

      const peerKey = selectedRoom?.userPublicKey ||
        config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY || '';
      const saved = await waku.send(roomId, peerKey, msg);

      if (isMounted.current) {
        setMessages((prev) => [...prev, saved]);
        setNewMessage('');
      }

      setTimeout(() => {
        if (isMounted.current) {
          messagesEndRef.current?.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
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
      console.error('Failed to start recording:', error);
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
      console.error('Failed to stop recording:', error);
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
      console.error('Error ensuring chat configured:', error);
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
            config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY
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
          messagesEndRef.current?.scrollToEnd({ animated: true });
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
      console.error('Failed to play audio:', error);
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
            config.EXPO_PUBLIC_ADMIN_PUBLIC_KEY
          );
      if (updated) {
        await db.updateMessageReactions(messageId, updated);
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      if (isMounted.current) {
        setShowReactions(null);
      }
    }
  };

  const navigateToUserProfile = async (userId: string) => {
    if (!isAdmin && !isDriver) return;

    try {
      if (isMounted.current) {
        setIsOpen(false);
        setProfileUserId(userId);
        setProfileModalVisible(true);
      }
    } catch (error) {
      console.error('Error opening user profile modal:', error);
    }
  };

  const backToRoomList = () => {
    if (isMounted.current) {
      setSelectedRoom(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessage = (item: ChatMessage) => (
    <Pressable
      key={item.id}
      style={[
        styles.messageContainer,
        item.isAdmin
          ? [
              styles.adminMessage,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
              },
            ]
          : [
              styles.userMessage,
              {
                backgroundColor: colors.gold,
              },
            ],
      ]}
      onLongPress={() => setShowReactions(item.id)}
    >
      <View style={styles.messageHeader}>
        <TouchableOpacity
          onPress={() => navigateToUserProfile(item.senderId)}
          disabled={!(isAdmin || isDriver)}
        >
          <Text
            style={[
              styles.senderName,
              (isAdmin || isDriver) && styles.clickableSender,
            ]}
          >
            {item.senderName}
          </Text>
        </TouchableOpacity>
      </View>

      {item.audioUri ? (
        <View style={styles.voiceMessageContainer}>
          <TouchableOpacity
            style={[
              styles.playButton,
              { backgroundColor: 'rgba(255,255,255,0.2)' },
            ]}
            onPress={() => playAudio(item.id, item.audioUri!)}
          >
            {playingAudio[item.id] ? (
              <Pause
                size={16}
                color={item.isAdmin ? colors.text.primary : colors.text.inverse}
              />
            ) : (
              <Play
                size={16}
                color={item.isAdmin ? colors.text.primary : colors.text.inverse}
              />
            )}
          </TouchableOpacity>
          <View style={styles.voiceWaveform}>
            <Text
              style={[
                styles.voiceDuration,
                item.isAdmin
                  ? { color: colors.text.primary }
                  : { color: colors.text.inverse },
              ]}
            >
              🎵 {formatDuration(item.audioDuration || 0)}
            </Text>
          </View>
        </View>
      ) : (
        <Text
          style={[
            styles.messageText,
            item.isAdmin
              ? { color: colors.text.primary }
              : { color: colors.text.inverse },
          ]}
        >
          {item.message}
        </Text>
      )}

      {item.reactions && Object.keys(item.reactions).length > 0 && (
        <View style={styles.reactionsContainer}>
          {Object.entries(item.reactions).map(([emoji, userIds]) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.reactionBubble,
                { backgroundColor: 'rgba(255,255,255,0.1)' },
              ]}
              onPress={() => addReaction(item.id, emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text
                style={[styles.reactionCount, { color: colors.text.secondary }]}
              >
                {userIds.length}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.messageTime}>
        {new Date(item.timestamp).toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>

      {/* Reaction Picker */}
      {showReactions === item.id && (
        <View
          style={[
            styles.reactionPicker,
            { backgroundColor: colors.surface.elevated },
          ]}
        >
          {EMOJI_REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.reactionOption}
              onPress={() => addReaction(item.id, emoji)}
            >
              <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Pressable>
  );

  const renderChatRoom = (item: ChatRoom) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.chatRoomItem,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
        },
      ]}
      onPress={() => openChat(item)}
    >
      <TouchableOpacity
        style={[styles.userAvatar, { backgroundColor: colors.gold }]}
        onPress={() => navigateToUserProfile(item.userId)}
      >
        <Text style={[styles.userInitial, { color: colors.text.inverse }]}>
          {item.userName ? item.userName.charAt(0).toUpperCase() : '?'}
        </Text>
      </TouchableOpacity>

      <View style={styles.chatRoomInfo}>
        <View style={styles.chatRoomHeader}>
          <TouchableOpacity onPress={() => navigateToUserProfile(item.userId)}>
            <Text
              style={[
                styles.userName,
                styles.clickableUserName,
                { color: colors.text.primary },
              ]}
            >
              {item.userName}
            </Text>
          </TouchableOpacity>
          <Text style={styles.messageTime}>
            {new Date(item.lastMessageTime).toLocaleTimeString('he-IL', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text
          style={[styles.lastMessage, { color: colors.text.secondary }]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>

      {item.unreadCount > 0 && (
        <View
          style={[styles.unreadBadge, { backgroundColor: colors.status.error }]}
        >
          <Text style={[styles.unreadCount, { color: colors.text.primary }]}>
            {item.unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSearchResult = (item: {
    id: string;
    displayName: string;
    isAppUser: boolean;
  }) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.chatRoomItem,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
        },
      ]}
      onPress={() => openSearchResult(item)}
    >
      <View style={[styles.userAvatar, { backgroundColor: colors.gold }]}>
        <Text style={[styles.userInitial, { color: colors.text.inverse }]}>
          {item.displayName ? item.displayName.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
      <View style={styles.chatRoomInfo}>
        <View style={styles.chatRoomHeader}>
          <Text style={[styles.userName, { color: colors.text.primary }]}>
            {item.displayName}
          </Text>
        </View>
        <Text style={[styles.userTypeLabel, { color: colors.text.secondary }]}>
          {item.isAppUser ? t('chat.appUser') : t('chat.matrixOnly')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const filteredRooms = chatRooms.filter(
    (room) =>
      room.userName &&
      room.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Only show chat widget for logged-in users
  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      {/* Chat Widget Button - Fixed to right side for RTL */}
      <TouchableOpacity
        style={[styles.chatButton, { backgroundColor: colors.gold }]}
        onPress={() => setIsOpen(true)}
      >
        <MessageCircle size={24} color={colors.text.inverse} />
        {unreadTotal > 0 && !isOpen && (
          <View
            style={[
              styles.widgetUnreadBadge,
              { backgroundColor: colors.status.error },
            ]}
          >
            <Text
              style={[styles.widgetUnreadText, { color: colors.text.primary }]}
            >
              {unreadTotal}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView
          style={[styles.chatContainer, { backgroundColor: colors.background }]}
        >
          {/* Chat Header */}
          <View
            style={[
              styles.chatHeader,
              {
                borderBottomColor: colors.border.primary,
                backgroundColor: colors.gold,
              },
            ]}
          >
            {(isAdmin || isDriver) && selectedRoom && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={backToRoomList}
              >
                <ChevronLeft size={24} color={colors.text.inverse} />
              </TouchableOpacity>
            )}
            <View style={styles.headerContent}>
              <Text style={[styles.chatTitle, { color: colors.text.inverse }]}>
                {isAdmin || isDriver
                  ? selectedRoom
                    ? selectedRoom.userName
                    : t('chat.adminChat')
                  : t('chat.customerSupport')}
              </Text>
              <Text style={styles.chatSubtitle}>
                {isAdmin || isDriver
                  ? selectedRoom
                    ? t('chat.customerSupportChat')
                    : t('chat.selectChatToStart')
                  : t('chat.chatWithTeam')}
              </Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => setIsMinimized(!isMinimized)}
                style={styles.headerButton}
              >
                <Minimize2 size={20} color={colors.text.inverse} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false);
                  setSelectedRoom(null);
                  setShowReactions(null);
                }}
                style={styles.headerButton}
              >
                <X size={20} color={colors.text.inverse} />
              </TouchableOpacity>
            </View>
          </View>

          {!isMinimized && (
            <KeyboardAvoidingView
              style={styles.chatContent}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              {(isAdmin || isDriver) && !selectedRoom ? (
                // Admin Chat List View
                <>
                  {/* Search */}
                  <View
                    style={[
                      styles.searchContainer,
                      {
                        backgroundColor: colors.surface.primary,
                        borderColor: colors.border.primary,
                      },
                    ]}
                  >
                    <Search size={20} color="#999" />
                    <TextInput
                      style={[
                        styles.searchInput,
                        { color: colors.text.primary },
                      ]}
                      placeholder={t('chat.searchUsers')}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      textAlign="right"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>

                  {/* Results / Chat Rooms List */}
                  {searchQuery.trim() ? (
                    <ScrollView
                      style={styles.chatRoomsList}
                      showsVerticalScrollIndicator={false}
                    >
                      {searchResults.length > 0 ? (
                        searchResults.map(renderSearchResult)
                      ) : (
                        <View style={styles.emptyContainer}>
                          <MessageCircle
                            size={60}
                            color={colors.interactive.disabled}
                          />
                          <Text
                            style={[
                              styles.emptyText,
                              { color: colors.text.secondary },
                            ]}
                          >
                            {t('chat.noUsersFound')}
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  ) : (
                    <ScrollView
                      style={styles.chatRoomsList}
                      showsVerticalScrollIndicator={false}
                    >
                      {filteredRooms.length > 0 ? (
                        filteredRooms.map(renderChatRoom)
                      ) : (
                        <View style={styles.emptyContainer}>
                          <MessageCircle
                            size={60}
                            color={colors.interactive.disabled}
                          />
                          <Text
                            style={[
                              styles.emptyText,
                              { color: colors.text.secondary },
                            ]}
                          >
                            {t('chat.noChatRooms')}
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  )}
                </>
              ) : (
                // Chat Messages View
                <>
                  {/* Messages List */}
                  <ScrollView
                    ref={messagesEndRef}
                    style={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                  >
                    {messages.length > 0 ? (
                      messages.map(renderMessage)
                    ) : (
                      <View style={styles.emptyMessagesContainer}>
                        <Text
                          style={[
                            styles.emptyMessagesText,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {t('chat.noMessagesYet')}
                        </Text>
                        <Text
                          style={[
                            styles.emptyMessagesSubtext,
                            { color: colors.text.tertiary },
                          ]}
                        >
                          {t('chat.startConversation')}
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* Message Input */}
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        borderTopColor: colors.border.primary,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    {isRecording ? (
                      <View
                        style={[
                          styles.recordingContainer,
                          { backgroundColor: colors.status.error },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.stopRecordingButton}
                          onPress={stopRecording}
                        >
                          <MicOff size={20} color={colors.text.inverse} />
                        </TouchableOpacity>
                        <View style={styles.recordingInfo}>
                          <Text
                            style={[
                              styles.recordingText,
                              { color: colors.text.inverse },
                            ]}
                          >
                            🔴 Recording... {formatDuration(recordingDuration)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          style={[
                            styles.messageInput,
                            {
                              borderColor: colors.border.primary,
                              backgroundColor: colors.surface.primary,
                              color: colors.text.primary,
                            },
                          ]}
                          value={newMessage}
                          onChangeText={setNewMessage}
                          placeholder={t('chat.typeMessage')}
                          multiline
                          maxLength={500}
                          textAlign="right"
                          placeholderTextColor={colors.text.tertiary}
                        />
                        {Platform.OS !== 'web' && (
                          <TouchableOpacity
                            style={[
                              styles.micButton,
                              {
                                backgroundColor: colors.surface.primary,
                                borderColor: colors.border.primary,
                                opacity: chatConfigOk ? 1 : 0.5,
                              },
                            ]}
                            onPress={startRecording}
                            disabled={!chatConfigOk}

                          >
                            <Mic size={20} color={colors.gold} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.sendButton,
                            {
                              backgroundColor:
                                newMessage.trim() && !isSending && chatConfigOk
                                  ? colors.gold
                                  : colors.interactive.disabled,
                            },
                          ]}
                          onPress={sendMessage}
                          disabled={!newMessage.trim() || isSending || !chatConfigOk}
                        >
                          <Send size={20} color={colors.text.inverse} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              )}
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Reaction Picker Overlay */}
      {showReactions && (
        <TouchableOpacity
          style={styles.reactionOverlay}
          activeOpacity={1}
          onPress={() => setShowReactions(null)}
        />
      )}

      <UserProfileModal
        visible={profileModalVisible}
        userId={profileUserId || ''}
        isAdmin={isAdmin || isDriver}
        onMessage={messageUser}
        onClose={() => {
          setProfileModalVisible(false);
          setProfileUserId(null);
        }}
      />

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chatButton: {
    position: 'absolute',
    bottom: 100,
    right: 20, // Fixed to right side for RTL
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    ...Platform.select({
      ios: { elevation: 8 },
      android: { elevation: 8 },
      web: { boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)' },
    }),
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginLeft: 8,
  },
  headerContent: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  chatSubtitle: {
    fontSize: 14,
    color: 'rgba(14, 13, 10, 0.8)',
    textAlign: 'right',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginRight: 12,
    padding: 4,
  },
  chatContent: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
    position: 'relative',
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  adminMessage: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
  },
  messageHeader: {
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  clickableSender: {
    textDecorationLine: 'underline',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  voiceWaveform: {
    flex: 1,
  },
  voiceDuration: {
    fontSize: 14,
    fontWeight: '500',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reactionEmoji: {
    fontSize: 12,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 10,
    fontWeight: '600',
  },
  reactionPicker: {
    position: 'absolute',
    top: -50,
    right: 0,
    flexDirection: 'row',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 8,
    zIndex: 1000,
    ...Platform.select({
      ios: { elevation: 5 },
      android: { elevation: 5 },
      web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)' },
    }),
  },
  reactionOption: {
    padding: 8,
  },
  reactionOptionEmoji: {
    fontSize: 20,
  },
  reactionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stopRecordingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  chatRoomsList: {
    flex: 1,
    paddingBottom: 20,
  },
  chatRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitial: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatRoomInfo: {
    flex: 1,
  },
  chatRoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  clickableUserName: {
    textDecorationLine: 'underline',
  },
  lastMessage: {
    fontSize: 14,
    textAlign: 'right',
  },
  unreadBadge: {
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  widgetUnreadBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetUnreadText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
  },
  userTypeLabel: {
    fontSize: 12,
  },
});
