import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Text, Button, Portal, Overlay } from '@/ui';
import { useTheme, useLanguage } from '@/ui/ThemeProvider';
import { spacing, radius, shadows, typography } from '@/shared/ui/tokens';
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
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmationModalProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const confirmLabel = confirmText ?? t('common.confirm');
  const cancelLabel = cancelText ?? t('common.cancel');

  if (!visible) return null;

  return (
    <Portal>
      <Overlay style={[styles.overlay, { backgroundColor: colors.canvas }]} />
      <View style={styles.center} pointerEvents="box-none">
        <View
          style={[styles.modalContainer, { backgroundColor: colors.surface.elevated }]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
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
              title={cancelLabel}
              onPress={onCancel}
              style={[styles.cancelButton, { borderColor: colors.border.primary }]}
              accessibilityRole="button"
            />

            <Button
              title={confirmLabel}
              onPress={onConfirm}
              style={[
                styles.confirmButton,
                {
                  backgroundColor: destructive
                    ? colors.status.error
                    : colors.interactive.primary,
                },
              ]}
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
    opacity: 0.5,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spacer20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...Platform.select(shadows.md),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.spacer16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: spacing.spacer4,
  },
  content: {
    padding: spacing.spacer20,
  },
  message: {
    ...typography.md,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.spacer16,
    gap: spacing.spacer12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
