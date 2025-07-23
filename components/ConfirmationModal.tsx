import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { X } from 'lucide-react-native';

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
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={[styles.modalContainer, { backgroundColor: colors.surface.elevated }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
                <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                  <X size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.content}>
                <Text style={[styles.message, { color: colors.text.secondary }]}>
                  {message}
                </Text>
              </View>
              
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    { borderColor: colors.border.primary }
                  ]}
                  onPress={onCancel}
                >
                  <Text style={[styles.buttonText, { color: colors.text.primary }]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    { backgroundColor: destructive ? colors.status.error : colors.gold }
                  ]}
                  onPress={() => {
                    onConfirm();
                  }}
                >
                  <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
