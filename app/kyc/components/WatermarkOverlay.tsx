import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WatermarkOverlayProps {
  appName: string;
  timestamp: number;
  nonce: string;
}

export default function WatermarkOverlay({
  appName,
  timestamp,
  nonce,
}: WatermarkOverlayProps): React.ReactElement {
  const timeLabel = new Date(timestamp).toLocaleString('he-IL');
  const nonceLabel = nonce.slice(0, 12);
  return (
    <View style={styles.overlay} pointerEvents="none">
      <Text style={styles.text}>{appName}</Text>
      <Text style={styles.text}>{timeLabel}</Text>
      <Text style={styles.text}>nonce {nonceLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 4,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
