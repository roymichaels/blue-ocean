import React, { useEffect, useState } from 'react';
import { View, Button } from 'react-native';
import { Stack } from 'expo-router';
import { initNear } from '../services/near';

export default function RootLayout() {
  const [near, setNear] = useState<Awaited<ReturnType<typeof initNear>> | null>(null);

  useEffect(() => {
    initNear().then(setNear);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {near && (
        <Button title="Connect NEAR Wallet" onPress={() => near.modal.show()} />
      )}
    </View>
  );
}
