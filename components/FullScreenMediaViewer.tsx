import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Modal,
  Text,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { X, ChevronLeft, ChevronRight, Share2, Download } from 'lucide-react-native';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name?: string;
}

interface FullScreenMediaViewerProps {
  visible: boolean;
  media: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function FullScreenMediaViewer({
  visible,
  media,
  initialIndex,
  onClose
}: FullScreenMediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [controlsVisible, setControlsVisible] = useState(true);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const videoRef = useRef<Video>(null);
  const { colors } = useTheme();

  const currentMedia = media[currentIndex];

  useEffect(() => {
    // Update current index when initialIndex changes
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const hideControls = () => {
    setControlsVisible(false);
  };

  const showControls = () => {
    setControlsVisible(true);
  };

  const toggleControls = () => {
    setControlsVisible(!controlsVisible);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetZoom();
    }
  };

  const goToNext = () => {
    if (currentIndex < media.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetZoom();
    }
  };

  const resetZoom = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const pinchHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      scale.value = Math.max(0.5, Math.min(event.scale, 4));
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
      }
    },
  });

  const panHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      if (scale.value > 1) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      } else {
        translateY.value = event.translationY;
      }
    },
    onEnd: (event) => {
      if (scale.value <= 1 && Math.abs(event.translationY) > 100) {
        runOnJS(onClose)();
      } else if (scale.value <= 1) {
        translateY.value = withSpring(0);
      } else {
        // Constrain pan within bounds when zoomed
        const maxTranslateX = (width * (scale.value - 1)) / 2;
        const maxTranslateY = (height * (scale.value - 1)) / 2;
        
        translateX.value = withSpring(
          Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value))
        );
        translateY.value = withSpring(
          Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value))
        );
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

  const handleShare = () => {
    if (Platform.OS === 'web') {
      Alert.alert('Share', 'Sharing is not available on web');
      return;
    }
    
    // In a real app, you would implement sharing functionality
    Alert.alert('Share', `Sharing ${currentMedia?.type} from ${currentMedia?.uri}`);
  };

  const handleDownload = () => {
    if (Platform.OS === 'web') {
      // For web, open in new tab
      window.open(currentMedia?.uri, '_blank');
      return;
    }
    
    // In a real app, you would implement download functionality
    Alert.alert('Download', `Downloading ${currentMedia?.type} from ${currentMedia?.uri}`);
  };

  if (!visible || !currentMedia) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        <StatusBar hidden={!controlsVisible} />
        
        {/* Controls Overlay */}
        {controlsVisible && (
          <>
            {/* Top Controls */}
            <Animated.View 
              style={[
                styles.topControls,
                { opacity: controlsVisible ? 1 : 0 }
              ]}
            >
              <TouchableOpacity style={styles.controlButton} onPress={onClose}>
                <X size={24} color={colors.text.inverse} />
              </TouchableOpacity>
              
              <View style={styles.mediaInfo}>
                <Text style={[styles.mediaTitle, { color: colors.text.inverse }]}>
                  {currentMedia.name || `Media ${currentIndex + 1}`}
                </Text>
                <Text style={styles.mediaCounter}>
                  {currentIndex + 1} of {media.length}
                </Text>
              </View>
              
              <View style={styles.topRightControls}>
                <TouchableOpacity style={styles.controlButton} onPress={handleShare}>
                  <Share2 size={24} color={colors.text.inverse} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={handleDownload}>
                  <Download size={24} color={colors.text.inverse} />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Navigation Controls */}
            {media.length > 1 && (
              <>
                {currentIndex > 0 && (
                  <TouchableOpacity 
                    style={[styles.navButton, styles.navButtonLeft]}
                    onPress={goToPrevious}
                  >
                    <ChevronLeft size={32} color={colors.text.inverse} />
                  </TouchableOpacity>
                )}
                
                {currentIndex < media.length - 1 && (
                  <TouchableOpacity 
                    style={[styles.navButton, styles.navButtonRight]}
                    onPress={goToNext}
                  >
                    <ChevronRight size={32} color={colors.text.inverse} />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Bottom Controls */}
            <Animated.View 
              style={[
                styles.bottomControls,
                { opacity: controlsVisible ? 1 : 0 }
              ]}
            >
              <View style={styles.mediaIndicators}>
                {media.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.indicator,
                      index === currentIndex && [styles.activeIndicator, { backgroundColor: colors.gold }]
                    ]}
                    onPress={() => {
                      setCurrentIndex(index);
                      resetZoom();
                    }}
                  />
                ))}
              </View>
            </Animated.View>
          </>
        )}

        {/* Media Content */}
        <View style={styles.mediaContainer}>
          <TouchableOpacity 
            style={styles.mediaWrapper}
            activeOpacity={1}
            onPress={toggleControls}
          >
            {currentMedia.type === 'video' ? (
              <Video
                ref={videoRef}
                style={styles.media}
                source={{ uri: currentMedia.uri }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay={visible}
              />
            ) : (
              <PinchGestureHandler onGestureEvent={pinchHandler}>
                <Animated.View style={styles.gestureContainer}>
                  <PanGestureHandler onGestureEvent={panHandler}>
                    <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                      <Image 
                        source={{ uri: currentMedia.uri }} 
                        style={styles.media}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </PanGestureHandler>
                </Animated.View>
              </PinchGestureHandler>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  mediaCounter: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    transform: [{ translateY: -30 }],
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  mediaIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
});