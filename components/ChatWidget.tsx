import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  I18nManager,
  Pressable,
} from 'react-native';
import { MessageCircle, Send, X, Minimize2, Search, ChevronLeft, Mic, MicOff, Play, Pause, Smile } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { MatrixService } from '../services/matrix';
import { ChatMessage, ChatRoom, User } from '../types';
import { useAuth } from './AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { router } from 'expo-router';
import InfoModal from './InfoModal';

// Enable RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<{ [key: string]: Audio.Sound }>({});
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const { isAdmin, isLoggedIn, user } = useAuth();
  const { colors } = useTheme();
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<ScrollView>(null);
  const matrixService = MatrixService.getInstance();

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      if (isAdmin) {
        loadChatRooms();
      } else {
        loadOrCreateDefaultRoom();
      }
    }
  }, [isOpen, isAdmin, isLoggedIn]);

  useEffect(() => {
    return () => {
      // Cleanup audio on unmount
      Object.values(playingAudio).forEach(sound => {
        sound.unloadAsync();
      });
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    // Listen for chat trigger events
    const handleChatTrigger = (userId: string) => {
      if (isAdmin) {
        // Find or create a room for this user
        const room = chatRooms.find(r => r.userId === userId);
        if (room) {
          setIsOpen(true);
          setSelectedRoom(room);
          loadMessages(room.id);
        } else {
          // In a real app, you would create a new room here
          setIsOpen(true);
          // For now, just show the room list
        }
      }
    };
    
    matrixService.addChatTriggerListener(handleChatTrigger);
    
    return () => {
      matrixService.removeChatTriggerListener(handleChatTrigger);
    };
  }, [chatRooms, isAdmin]);

  const loadChatRooms = async () => {
    try {
      const roomsData = await matrixService.getRooms();
      setChatRooms(roomsData);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      // Use default room as fallback
      setChatRooms([{
        id: 'default_room',
        userId: 'guest_user',
        userName: 'Guest User',
        lastMessage: 'Welcome to our store!',
        lastMessageTime: Date.now() - 3600000, // 1 hour ago
        unreadCount: 0
      }]);
    }
  };

  const loadOrCreateDefaultRoom = async () => {
    try {
      // For non-admin users, always use a default room
      const defaultRoom = {
        id: 'default_room',
        userId: user?.id || 'guest_user',
        userName: user?.displayName || 'Guest User',
        lastMessage: 'Welcome to our store!',
        lastMessageTime: Date.now() - 3600000, // 1 hour ago
        unreadCount: 0
      };
      
      setSelectedRoom(defaultRoom);
      await loadMessages(defaultRoom.id);
    } catch (error) {
      console.error('Error creating default room:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אירעה שגיאה ביצירת חדר צ\'אט',
        type: 'error'
      });
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const messagesData = await matrixService.getChatMessages(roomId);
      setMessages(messagesData);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      // Use default welcome message as fallback
      setMessages([{
        id: 'default_msg',
        senderId: 'admin',
        senderName: 'Admin',
        message: 'Welcome to our store! How can I help you today?',
        timestamp: Date.now() - 3600000, // 1 hour ago
        isAdmin: true
      }]);
    }
  };

  const openChat = async (room: ChatRoom) => {
    setSelectedRoom(room);
    await loadMessages(room.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const roomId = selectedRoom ? selectedRoom.id : 'default_room';
    
    try {
      // Send message using Matrix service
      const success = await matrixService.sendMessage(roomId, newMessage.trim());
      
      // Add message to local state
      const message: ChatMessage = {
        id: Date.now().toString(),
        senderId: isAdmin ? (process.env.EXPO_PUBLIC_ADMIN_USERNAME || 'admin') : (user?.id || 'user_guest'),
        senderName: isAdmin ? 'מנהל' : (user?.displayName || 'משתמש אורח'),
        message: newMessage.trim(),
        timestamp: Date.now(),
        isAdmin: isAdmin,
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // If not admin, simulate admin response after a delay
      if (!isAdmin) {
        setTimeout(() => {
          const adminResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            senderId: process.env.EXPO_PUBLIC_ADMIN_USERNAME || 'admin',
            senderName: 'מנהל',
            message: 'תודה על הפנייה! איך אוכל לעזור לך היום?',
            timestamp: Date.now(),
            isAdmin: true,
          };
          setMessages(prev => [...prev, adminResponse]);
          
          // Scroll to bottom again
          setTimeout(() => {
            messagesEndRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'שליחת ההודעה נכשלה',
        type: 'error'
      });
    }
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        setInfoModal({
          visible: true,
          title: 'הודעות קוליות',
          message: 'הקלטת הודעות קוליות אינה נתמכת בגרסת הדפדפן',
          type: 'info'
        });
        return;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setInfoModal({
          visible: true,
          title: 'נדרשת הרשאה',
          message: 'אנא אשר הרשאת מיקרופון כדי להקליט הודעות קוליות',
          type: 'warning'
        });
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'ההקלטה נכשלה',
        type: 'error'
      });
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        // In a real app, you would upload to Pinata here
        console.log('Voice message recorded:', uri);
        
        const roomId = selectedRoom ? selectedRoom.id : 'default_room';
        const voiceMessage: ChatMessage = {
          id: Date.now().toString(),
          senderId: isAdmin ? (process.env.EXPO_PUBLIC_ADMIN_USERNAME || 'admin') : (user?.id || 'user_guest'),
          senderName: isAdmin ? 'מנהל' : (user?.displayName || 'משתמש אורח'),
          message: '',
          timestamp: Date.now(),
          isAdmin: isAdmin,
          audioUri: uri,
          audioDuration: recordingDuration
        };

        setMessages(prev => [...prev, voiceMessage]);

        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }

      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const playAudio = async (messageId: string, audioUri: string) => {
    try {
      if (Platform.OS === 'web') {
        setInfoModal({
          visible: true,
          title: 'הודעות קוליות',
          message: 'השמעת הודעות קוליות אינה נתמכת בגרסת הדפדפן',
          type: 'info'
        });
        return;
      }

      // Stop any currently playing audio
      if (playingAudio[messageId]) {
        await playingAudio[messageId].stopAsync();
        await playingAudio[messageId].unloadAsync();
        setPlayingAudio(prev => {
          const newState = { ...prev };
          delete newState[messageId];
          return newState;
        });
        return;
      }

      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      
      setPlayingAudio(prev => ({ ...prev, [messageId]: sound }));
      
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudio(prev => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      // Update local state
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = { ...msg.reactions } || {};
          if (!reactions[emoji]) {
            reactions[emoji] = [];
          }
          
          const userId = user?.id || 'guest_user';
          if (reactions[emoji].includes(userId)) {
            reactions[emoji] = reactions[emoji].filter(id => id !== userId);
            if (reactions[emoji].length === 0) {
              delete reactions[emoji];
            }
          } else {
            reactions[emoji].push(userId);
          }
          
          return { ...msg, reactions };
        }
        return msg;
      }));

      setShowReactions(null);
      
      // Try to update in Matrix
      const roomId = selectedRoom?.id || 'default_room';
      await matrixService.updateChatMessageReactions(roomId, messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
      setShowReactions(null);
    }
  };

  const navigateToUserProfile = async (userId: string) => {
    if (!isAdmin) return;
    
    try {
      setIsOpen(false);
      router.push(`/user/${encodeURIComponent(userId)}`);
    } catch (error) {
      console.error('Error navigating to user profile:', error);
    }
  };

  const backToRoomList = () => {
    setSelectedRoom(null);
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
        item.isAdmin ? [styles.adminMessage, { 
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary 
        }] : [styles.userMessage, { 
          backgroundColor: colors.gold 
        }]
      ]}
      onLongPress={() => setShowReactions(item.id)}
    >
      <View style={styles.messageHeader}>
        <TouchableOpacity 
          onPress={() => navigateToUserProfile(item.senderId)}
          disabled={!isAdmin}
        >
          <Text style={[
            styles.senderName,
            isAdmin && styles.clickableSender
          ]}>
            {item.senderName}
          </Text>
        </TouchableOpacity>
      </View>

      {item.audioUri ? (
        <View style={styles.voiceMessageContainer}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => playAudio(item.id, item.audioUri!)}
          >
            {playingAudio[item.id] ? (
              <Pause size={16} color={item.isAdmin ? colors.text.primary : colors.text.inverse} />
            ) : (
              <Play size={16} color={item.isAdmin ? colors.text.primary : colors.text.inverse} />
            )}
          </TouchableOpacity>
          <View style={styles.voiceWaveform}>
            <Text style={[
              styles.voiceDuration,
              item.isAdmin ? { color: colors.text.primary } : { color: colors.text.inverse }
            ]}>
              🎵 {formatDuration(item.audioDuration || 0)}
            </Text>
          </View>
        </View>
      ) : (
        <Text
          style={[
            styles.messageText,
            item.isAdmin ? { color: colors.text.primary } : { color: colors.text.inverse }
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
              style={[styles.reactionBubble, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
              onPress={() => addReaction(item.id, emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text style={[styles.reactionCount, { color: colors.text.secondary }]}>{userIds.length}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.messageTime}>
        {new Date(item.timestamp).toLocaleTimeString('he-IL', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>

      {/* Reaction Picker */}
      {showReactions === item.id && (
        <View style={[styles.reactionPicker, { backgroundColor: colors.surface.elevated }]}>
          {EMOJI_REACTIONS.map(emoji => (
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
      style={[styles.chatRoomItem, { 
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary 
      }]}
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
            <Text style={[styles.userName, styles.clickableUserName, { color: colors.text.primary }]}>
              {item.userName}
            </Text>
          </TouchableOpacity>
          <Text style={styles.messageTime}>
            {new Date(item.lastMessageTime).toLocaleTimeString('he-IL', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
        <Text style={[styles.lastMessage, { color: colors.text.secondary }]} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
      
      {item.unreadCount > 0 && (
        <View style={[styles.unreadBadge, { backgroundColor: colors.status.error }]}>
          <Text style={[styles.unreadCount, { color: colors.text.primary }]}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const filteredRooms = chatRooms.filter(room =>
    room.userName && room.userName.toLowerCase().includes(searchQuery.toLowerCase())
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
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={[styles.chatContainer, { backgroundColor: colors.background }]}>
          {/* Chat Header */}
          <View style={[styles.chatHeader, { 
            borderBottomColor: colors.border.primary,
            backgroundColor: colors.gold 
          }]}>
            {isAdmin && selectedRoom && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={backToRoomList}
              >
                <ChevronLeft size={24} color={colors.text.inverse} />
              </TouchableOpacity>
            )}
            <View style={styles.headerContent}>
              <Text style={[styles.chatTitle, { color: colors.text.inverse }]}>
                {isAdmin 
                  ? (selectedRoom ? selectedRoom.userName : "צ'אט מנהל") 
                  : "תמיכת לקוחות"}
              </Text>
              <Text style={styles.chatSubtitle}>
                {isAdmin 
                  ? (selectedRoom ? "צ'אט תמיכת לקוחות" : "בחר צ'אט להתחלה") 
                  : "צ'אט עם הצוות שלנו"}
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
              {isAdmin && !selectedRoom ? (
                // Admin Chat List View
                <>
                  {/* Search */}
                  <View style={[styles.searchContainer, { 
                    backgroundColor: colors.surface.primary,
                    borderColor: colors.border.primary 
                  }]}>
                    <Search size={20} color="#999" />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text.primary }]}
                      placeholder="חיפוש משתמשים..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      textAlign="right"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>

                  {/* Chat Rooms List */}
                  <ScrollView
                    style={styles.chatRoomsList}
                    showsVerticalScrollIndicator={false}
                  >
                    {filteredRooms.length > 0 ? (
                      filteredRooms.map(renderChatRoom)
                    ) : (
                      <View style={styles.emptyContainer}>
                        <MessageCircle size={60} color={colors.interactive.disabled} />
                        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>לא נמצאו חדרי צ'אט</Text>
                      </View>
                    )}
                  </ScrollView>
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
                        <Text style={[styles.emptyMessagesText, { color: colors.text.secondary }]}>אין הודעות עדיין</Text>
                        <Text style={[styles.emptyMessagesSubtext, { color: colors.text.tertiary }]}>התחל את השיחה!</Text>
                      </View>
                    )}
                  </ScrollView>

                  {/* Message Input */}
                  <View style={[styles.inputContainer, { 
                    borderTopColor: colors.border.primary,
                    backgroundColor: colors.background 
                  }]}>
                    {isRecording ? (
                      <View style={[styles.recordingContainer, { backgroundColor: colors.status.error }]}>
                        <TouchableOpacity
                          style={styles.stopRecordingButton}
                          onPress={stopRecording}
                        >
                          <MicOff size={20} color={colors.text.inverse} />
                        </TouchableOpacity>
                        <View style={styles.recordingInfo}>
                          <Text style={[styles.recordingText, { color: colors.text.inverse }]}>
                            🔴 Recording... {formatDuration(recordingDuration)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          style={[styles.messageInput, { 
                            borderColor: colors.border.primary,
                            backgroundColor: colors.surface.primary,
                            color: colors.text.primary 
                          }]}
                          value={newMessage}
                          onChangeText={setNewMessage}
                          placeholder="הקלד את ההודעה שלך..."
                          multiline
                          maxLength={500}
                          textAlign="right"
                          placeholderTextColor={colors.text.tertiary}
                        />
                        {Platform.OS !== 'web' && (
                          <TouchableOpacity
                            style={[styles.micButton, { 
                              backgroundColor: colors.surface.primary,
                              borderColor: colors.border.primary 
                            }]}
                            onPress={startRecording}
                          >
                            <Mic size={20} color={colors.gold} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.sendButton,
                            { backgroundColor: newMessage.trim() ? colors.gold : colors.interactive.disabled }
                          ]}
                          onPress={sendMessage}
                          disabled={!newMessage.trim()}
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

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({...infoModal, visible: false})}
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1000,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
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
});