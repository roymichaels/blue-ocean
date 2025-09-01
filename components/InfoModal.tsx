import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { spacing, radius, zIndex, shadows } from '../constants/tokens';
import { X, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Info, TriangleAlert as AlertTriangle } from 'lucide-react-native';

type InfoType = 'success' | 'error' | 'info' | 'warning';

interface InfoModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: InfoType;
  buttonText?: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseTime?: number;
}

export default function InfoModal({
  visible,
  title,
  message,
  type = 'info',
  buttonText,
  onClose,
  autoClose = true,
  autoCloseTime = 3000,
}: InfoModalProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const buttonLabel = buttonText ?? t('common.confirm');
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      if (autoClose) {
        const timer = setTimeout(() => {
          onClose();
        }, autoCloseTime);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset animations when modal is hidden
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, autoClose, autoCloseTime, scaleAnim, opacityAnim, onClose]);

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle size={32} color={colors.status.success} />,
          color: colors.status.success
        };
      case 'error':
        return {
          icon: <AlertCircle size={32} color={colors.status.error} />,
          color: colors.status.error
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={32} color={colors.status.warning} />,
          color: colors.status.warning
        };
      case 'info':
      default:
        return {
          icon: <Info size={32} color={colors.status.info} />,
          color: colors.status.info
        };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: colors.surface.elevated,
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                }
              ]}
            >
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>

              <View style={styles.iconContainer}>
                {icon}
              </View>

              <Text style={[styles.title, { color: colors.text.primary }]}>
                {title}
              </Text>

              <Text style={[styles.message, { color: colors.text.secondary }]}> 
                {message}
              </Text>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: color }]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, { color: colors.text.inverse }]}> 
                  {buttonLabel}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spacer20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    padding: spacing.spacer24,
    alignItems: 'center',
    ...Platform.select(shadows.md),
  },
  closeButton: {
    position: 'absolute',
    top: spacing.spacer12,
    end: spacing.spacer12,
    padding: spacing.spacer4,
    zIndex: zIndex.dropdown,
  },
  iconContainer: {
    marginBottom: spacing.spacer16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.spacer8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.spacer24,
    lineHeight: 24,
  },
  button: {
    paddingVertical: spacing.spacer12,
    paddingHorizontal: spacing.spacer24,
    borderRadius: radius.lg,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
