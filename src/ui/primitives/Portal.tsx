import React, { ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
}

export default function Portal({ children }: PortalProps) {
  if (Platform.OS === 'web') {
    return createPortal(
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>,
      document.body
    );
  }

  return (
    <Modal transparent>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>
    </Modal>
  );
}
