import React, { ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
}

export default function Portal({ children }: PortalProps) {
  if (Platform.OS === 'web') {
    // On some mobile emulations, a full-screen portal container with box-none
    // can still intercept touches. Use pointerEvents: 'none' on the wrapper
    // and re-enable events on an inner container to guarantee underlying
    // content remains clickable.
    return createPortal(
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        <View style={{ pointerEvents: 'auto' }}>{children}</View>
      </View>,
      document.body
    );
  }

  return (
    <Modal transparent>
      {/* On native, allow touches to be captured by children (menus/overlays) */}
      <View style={StyleSheet.absoluteFill}>
        {children}
      </View>
    </Modal>
  );
}
