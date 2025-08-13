import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from './AuthContext';
import useChatRooms from '../hooks/useChatRooms';
import useChatMessages from '../hooks/useChatMessages';
import RoomList from './chat/RoomList';
import MessageList from './chat/MessageList';
import MessageInput from './chat/MessageInput';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { colors } = useTheme();
  const { isAdmin, isDriver, isLoggedIn, user } = useAuth();

  const { chatRooms, selectedRoom, setSelectedRoom, loadChatRooms, unreadTotal } =
    useChatRooms(isOpen);
  const { messages, newMessage, setNewMessage, sendMessage } = useChatMessages(
    selectedRoom,
    user,
    isAdmin,
  );

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
              <MessageList messages={messages} colors={colors} />
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
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
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
