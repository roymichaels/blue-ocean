import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MessageCircle, Send, X } from 'lucide-react-native';
import { ChatRoom, ChatMessage } from '../types';
import DatabaseService from '../services/database';

interface Props {
  chatRooms: ChatRoom[];
}

export default function AdminChatList({ chatRooms }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const filteredRooms = chatRooms.filter(room =>
    room.userName && room.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openChat = async (room: ChatRoom) => {
    setSelectedRoom(room);
    const db = DatabaseService.getInstance();
    const roomMessages = await db.getChatMessages(room.id);
    setMessages(roomMessages);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: process.env.EXPO_PUBLIC_ADMIN_USERNAME || 'admin',
      senderName: 'Admin',
      message: newMessage.trim(),
      timestamp: Date.now(),
      isAdmin: true,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Send to database
    const db = DatabaseService.getInstance();
    await db.sendChatMessage(selectedRoom.id, message);
  };

  const renderChatRoom = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={styles.chatRoomItem}
      onPress={() => openChat(item)}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userInitial}>
          {item.userName ? item.userName.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
      
      <View style={styles.chatRoomInfo}>
        <View style={styles.chatRoomHeader}>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={styles.messageTime}>
            {new Date(item.lastMessageTime).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
      
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.messageContainer,
        item.isAdmin ? styles.adminMessage : styles.userMessage
      ]}
    >
      <Text style={styles.senderName}>{item.senderName}</Text>
      <Text
        style={[
          styles.messageText,
          item.isAdmin ? styles.adminMessageText : styles.userMessageText
        ]}
      >
        {item.message}
      </Text>
      <Text style={styles.messageTime}>
        {new Date(item.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Chat Rooms List */}
      <FlatList
        data={filteredRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatRoomsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageCircle size={60} color="#CCC" />
            <Text style={styles.emptyText}>No chat rooms found</Text>
          </View>
        }
      />

      {/* Chat Modal */}
      <Modal
        visible={!!selectedRoom}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRoom(null)}
      >
        {selectedRoom && (
          <SafeAreaView style={styles.chatContainer}>
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <View>
                <Text style={styles.chatTitle}>{selectedRoom.userName}</Text>
                <Text style={styles.chatSubtitle}>Customer Support Chat</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedRoom(null)}
                style={styles.closeButton}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              style={styles.chatContent}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              {/* Messages List */}
              <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyMessagesContainer}>
                    <Text style={styles.emptyMessagesText}>No messages yet</Text>
                  </View>
                }
              />

              {/* Message Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Type your message..."
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !newMessage.trim() && styles.sendButtonDisabled
                  ]}
                  onPress={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  chatRoomsList: {
    paddingBottom: 20,
  },
  chatRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#20B2AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitial: {
    color: '#FFFFFF',
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
    color: '#333',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#20B2AA',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chatSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeButton: {
    padding: 4,
  },
  chatContent: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  adminMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#20B2AA',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#333',
  },
  adminMessageText: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#20B2AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: '#666',
  },
});
