import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AuroraSphereProps {
  amplitude: number; // 0..1
  size?: number;
  colors?: string[];
}

export default function AuroraSphere({
  amplitude,
  size = 160,
  colors = ['#00f0ff', '#6f00ff'],
}: AuroraSphereProps) {
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: 0.8 + amplitude * 0.4,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [amplitude]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale }],
        },
      ]}
    >
      <LinearGradient
        colors={colors}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
});
