import React from 'react';
import { View, StyleSheet } from 'react-native';
import StoreCreation from '@/features/stores/components/StoreCreation';

export default function StoreCreateScreen() {
  return (
    <View style={styles.container}>
      <StoreCreation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
