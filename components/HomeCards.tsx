import React, { useCallback, useEffect, useState } from 'react';
import { Button, FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

interface Card {
  id: string;
  title: string;
  image: string;
}

export default function HomeCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { width } = useWindowDimensions();
  const numColumns = width >= 1024 ? 3 : width >= 640 ? 2 : 1;

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const url = new URL('api/catalog.json', globalThis.location.origin);
      const res = await fetch(url.toString());
      const data = (await res.json()) as Card[];
      setCards(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  if (loading) {
    return <Text accessibilityRole="text">Loading catalog...</Text>;
  }

  if (error) {
    return (
      <View>
        <Text accessibilityRole="text">Failed to load catalog.</Text>
        <Button title="Retry" onPress={loadCards} accessibilityRole="button" />
      </View>
    );
  }

  return (
    <FlatList
      data={cards}
      key={numColumns}
      numColumns={numColumns}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image
            source={{ uri: item.image }}
            style={styles.image}
            contentFit="cover"
            transition={100}
            cachePolicy="memory-disk"
            accessibilityLabel={item.title}
            alt={item.title}
            priority="low"
          />
          <Text accessibilityRole="text" style={styles.title}>{item.title}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  title: {
    marginTop: 4,
    textAlign: 'center',
  },
});
