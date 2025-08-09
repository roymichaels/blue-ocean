import React from 'react';
import { View, StyleSheet } from 'react-native';
import StoreCreation from '../../components/StoreCreation';

export default function StoresScreen() {
  return (
    <View style={styles.container}>
      <StoreCreation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
