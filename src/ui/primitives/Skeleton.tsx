import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleProp, ViewStyle, Platform, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeProvider';
import useReducedMotion from '@/shared/hooks/useReducedMotion';
import { radius } from '@/shared/ui/tokens';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export default function Skeleton({
  width = '100%',
  height = 16,
  style,
  borderRadius = radius.sm,
}: SkeletonProps) {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer, reduceMotion]);

  const translateX = reduceMotion
    ? 0
    : shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 100],
      });

  return (
    <View
      style={[
        {
          width,
          height,
          overflow: 'hidden',
          borderRadius,
          backgroundColor: colors.surface.secondary,
        },
        style,
      ]}
    >
      {reduceMotion ? (
        <View style={{ flex: 1 }} />
      ) : (
        <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
          <LinearGradient
            colors={[
              colors.surface.secondary,
              colors.surface.primary,
              colors.surface.secondary,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </View>
  );
}
