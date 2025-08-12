import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import storesAgent from '../../agents/stores-agent';
import { useTheme } from '../../contexts/ThemeContext';
import { Store } from '../../types';

export default function StorefrontStoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [store, setStore] = useState<Store | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    let callback: ((sid: string, s: number) => void) | undefined;
    const load = async () => {
      if (!id) return;
      const s = await storesAgent.get(id);
      setStore(s);
      setScore(storesAgent.getReputationScore(id));
      callback = (sid: string, sc: number) => {
        if (sid === id) setScore(sc);
      };
      storesAgent.subscribe(callback);
    };
    load();
    return () => {
      if (callback) storesAgent.unsubscribe(callback);
    };
  }, [id]);

  if (!store) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.text.primary }}>Store not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.name, { color: colors.text.primary }]}>{store.name}</Text>
      <Text style={{ color: colors.text.secondary }}>Reputation: {score.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
});

