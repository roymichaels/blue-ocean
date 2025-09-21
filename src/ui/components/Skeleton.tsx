import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/ui/theme/ThemeProvider';

type SkeletonWidth = number | `${number}%`;

interface SkeletonProps {
  width?: SkeletonWidth;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 80, radius = 12, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const {
    colors: { surface, border },
  } = useTheme();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [shimmer]);

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-0.5, 0.5] });

  const baseStyle: StyleProp<ViewStyle> = [
    {
      width,
      height,
      borderRadius: radius,
      overflow: 'hidden',
      backgroundColor: surface,
      borderWidth: 1,
      borderColor: border,
      opacity: 0.7,
      transform: [{ translateX }],
    },
    style,
  ];

  return <Animated.View style={baseStyle} />;
}
