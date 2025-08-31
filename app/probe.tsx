import React from 'react';
import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function Probe() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0b', gap: 12 }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>PROBE OK</Text>
      <Link href="/(tabs)/categories" style={{ color: '#4ade80', fontWeight: '700' }}>Open Tabs → Categories</Link>
    </View>
  );
}

