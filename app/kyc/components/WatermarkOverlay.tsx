
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { sha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';


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

  
  const timeLabel = useMemo(() => new Date(timestamp).toLocaleString('he-IL'), [timestamp]);
  const nonceLabel = useMemo(() => nonce.slice(0, 12), [nonce]);
  const hashLabel = useMemo(() => {
    if (!nonce) return '';
    const bytes = Buffer.from(`${timestamp}:${nonce}`);
    const digest = Buffer.from(sha256(bytes)).toString('hex');
    return digest.slice(0, 16);
  }, [nonce, timestamp]);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Text style={styles.text}>{appName}</Text>
      <Text style={styles.text}>{timeLabel}</Text>
      <Text style={styles.text}>nonce {nonceLabel}</Text>
      {hashLabel ? <Text style={styles.text}>hash {hashLabel}</Text> : null}
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
