import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0b' }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
        Blue Ocean — App Mounted ✅
      </Text>
      <Text style={{ color: '#9ca3af', marginTop: 8 }}>Router temporarily bypassed for debugging.</Text>
      <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#059669', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
        <Text style={{ color: '#fff', fontFamily: 'monospace', fontSize: 12 }}>APP OK</Text>
      </View>
    </View>
  );
}
