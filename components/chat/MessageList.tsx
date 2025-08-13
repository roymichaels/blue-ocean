import React, { useEffect } from 'react';
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
import eventBus from '../../services/eventBus';

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
  useEffect(() => {
    eventBus.track('chat.view', { messageCount: messages.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onLoadMore || !hasMore || loadingMore) return;
    if (e.nativeEvent.contentOffset.y <= 0) {
      eventBus.track('chat.load_more', { messageCount: messages.length });
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
  loader: {
    padding: 8,
  },
});

export default MessageList;
