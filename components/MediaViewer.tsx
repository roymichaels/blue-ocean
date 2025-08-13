import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import SmartImage from './SmartImage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

interface Props {
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function MediaViewer({ media, initialIndex, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pinchHandler = useAnimatedGestureHandler({
    onActive: (event: any) => {
      scale.value = event.scale;
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
      }
    },
  });

  const panHandler = useAnimatedGestureHandler({
    onActive: (event: any) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    },
    onEnd: (event: any) => {
      // If dragged down significantly, close the viewer
      if (Math.abs(event.translationY) > 100) {
        runOnJS(onClose)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const currentMedia = media[currentIndex];

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <TouchableOpacity
        style={[
          styles.closeButton,
          { top: insets.top + 16, end: insets.end + 16 },
        ]}
        onPress={onClose}
      >
        <X size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.mediaContainer}>
        <PinchGestureHandler onGestureEvent={pinchHandler}>
          <Animated.View style={styles.gestureContainer}>
            <PanGestureHandler onGestureEvent={panHandler}>
              <Animated.View style={[styles.mediaWrapper, animatedStyle]}>
                {currentMedia?.type === 'image' ? (
                  <SmartImage uri={currentMedia.url} style={styles.media} contentFit="contain" cachePolicy="disk" />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    {/* In a real app, you'd use react-native-video here */}
                    <SmartImage uri={currentMedia?.url || ''} style={styles.media} contentFit="contain" cachePolicy="disk" />
                  </View>
                )}
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </View>

      {/* Media indicators */}
      {media.length > 1 && (
        <View style={[styles.indicators, { bottom: insets.bottom + 24 }]}>
          {media.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.activeIndicator
              ]}
            />
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  closeButton: {
    position: 'absolute',
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaWrapper: {
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicators: {
    position: 'absolute',
    bottom: 100,
    start: 0,
    end: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#FFFFFF',
  },
});
