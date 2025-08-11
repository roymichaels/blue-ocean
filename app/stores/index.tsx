import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export default function StoresScreen() {
  return (
    <View style={styles.container}>
      <Text>Stores</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
});
