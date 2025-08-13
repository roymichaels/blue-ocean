import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../../types';

interface Props {
  messages: ChatMessage[];
  colors: any;
}

const MessageList: React.FC<Props> = ({ messages, colors }) => {
  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={[styles.message, { color: colors.text.primary }]}>{item.message}</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'right',
  },
});

export default MessageList;
