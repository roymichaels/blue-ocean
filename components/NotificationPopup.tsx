import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { spacing, zIndex } from '@/shared/ui/tokens';
import { Portal, Overlay, Heading, Text } from '@/ui';

interface NotificationPopupProps {
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
  onClose: () => void;
  onPress?: () => void;
}

const { width } = Dimensions.get('window');

export default function NotificationPopup({
  title,
  message,
  type = 'info',
  duration = 3000,
  onClose,
  onPress,
}: NotificationPopupProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      dismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start(() => {
      onClose();
    });
  };

  const handlePress = () => {
    onPress?.();
    dismiss();
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.status.success;
      case 'warning':
        return colors.status.warning;
      case 'error':
        return colors.status.error;
      case 'info':
      default:
        return colors.status.info;
    }
  };

  return (
    <Portal>
      <Overlay />
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY }],
              opacity,
              backgroundColor: getBackgroundColor()
            }
          ]}
        >
          <View style={styles.content}>
            <View style={styles.textContainer}>
              <Heading
                size="md"
                style={[styles.title, { color: colors.text.inverse }]}
              >
                {title}
              </Heading>
              <Text
                style={[styles.message, { color: colors.text.inverse }]}
                numberOfLines={2}
                variant="sm"
              >
                {message}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={dismiss}>
              <X size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    padding: spacing.spacer16,
    zIndex: zIndex.modal,
    width: width,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.spacer8,
  },
  title: {
    marginBottom: spacing.spacer4,
  },
  message: {},
  closeButton: {
    padding: spacing.spacer4,
  },
});
