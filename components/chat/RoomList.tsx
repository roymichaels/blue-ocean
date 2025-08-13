import React from 'react';
import { FlatList, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ChatRoom } from '../../types';

interface Props {
  rooms: ChatRoom[];
  selectedRoom: ChatRoom | null;
  onSelect: (room: ChatRoom) => void;
  colors: any;
}

const RoomList: React.FC<Props> = ({ rooms, selectedRoom, onSelect, colors }) => {
  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onSelect(item)}
          style={[
            styles.item,
            {
              backgroundColor:
                selectedRoom?.id === item.id
                  ? colors.surface.secondary
                  : 'transparent',
              borderColor: colors.border.primary,
            },
          ]}
        >
          <Text style={[styles.name, { color: colors.text.primary }]}>{item.userName}</Text>
          {item.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.badgeText, { color: colors.text.inverse }]}>
                {item.unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 12,
    borderBottomWidth: 1,
  },
  name: {
    textAlign: 'right',
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default RoomList;
