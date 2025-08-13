import React from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { ChatMessage } from '../../types';

interface Props {
  messages: ChatMessage[];
  colors: any;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

const MessageList: React.FC<Props> = ({
  messages,
  colors,
  onLoadMore,
  hasMore,
  loadingMore,
}) => {
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onLoadMore || !hasMore || loadingMore) return;
    if (e.nativeEvent.contentOffset.y <= 0) {
      onLoadMore();
    }
  };

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={[styles.message, { color: colors.text.primary }]}>
            {item.message}
          </Text>
        </View>
      )}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      ListHeaderComponent={
        loadingMore ? (
          <ActivityIndicator style={styles.loader} />
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'end',
  },
  loader: {
    padding: 8,
  },
});

export default MessageList;
