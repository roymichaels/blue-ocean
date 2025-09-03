import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { X } from 'lucide-react-native';
import Button from './ui/Button';
import { Portal, Overlay } from '@/ui/primitives';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'אישור',
  cancelText = 'ביטול',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmationModalProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Portal>
      <Overlay style={styles.overlay} />
      <View style={styles.center} pointerEvents="box-none">
        <View
          style={[styles.modalContainer, { backgroundColor: colors.surface.elevated }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.closeButton}
              accessibilityRole="button"
            >
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={[styles.message, { color: colors.text.secondary }]}>
              {message}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              title={cancelText}
              variant="secondary"
              onPress={onCancel}
              style={{ flex: 1 }}
              accessibilityRole="button"
            />

            <Button
              title={confirmText}
              onPress={onConfirm}
              style={{
                flex: 1,
                backgroundColor: destructive
                  ? colors.status.error
                  : colors.interactive.primary,
              }}
              accessibilityRole="button"
            />
          </View>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { elevation: 5 },
      android: { elevation: 5 },
      web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)' },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
});
