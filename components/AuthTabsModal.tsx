import React from 'react';
import { View, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import WalletConnectButton from './WalletConnectButton';

interface AuthTabsModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
}

export default function AuthTabsModal({ visible, onClose }: AuthTabsModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface.primary }]}> 
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <WalletConnectButton />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    padding: 24,
    borderRadius: 8,
    width: '80%',
  },
  close: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
