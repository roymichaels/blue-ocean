import React, { useState } from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import LoadingSpinner from './LoadingSpinner';
import { useTheme } from '../contexts/ThemeContext';

interface MoonPayModalProps {
  visible: boolean;
  onClose: () => void;
  walletAddress: string;
  coin: 'eth' | 'usdt' | 'usdc';
  amountUSD: number;
}

export default function MoonPayModal({
  visible,
  onClose,
  walletAddress,
  coin,
  amountUSD,
}: MoonPayModalProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);

  const url = `https://buy.moonpay.com?currencyCode=${coin}&walletAddress=${walletAddress}&baseCurrencyCode=usd`;

  // Inject JavaScript to pre-fill the fiat amount once the widget has loaded
  const injectedJavaScript = `
    setTimeout(function() {
      var input = document.querySelector('input[name="base-amount-input"], input[name="baseAmount"]');
      if (input) {
        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, '${amountUSD}');
        var ev = new Event('input', { bubbles: true });
        input.dispatchEvent(ev);
      }
    }, 2500);
    true;
  `;

  const handleNavigationChange = (event: any) => {
    if (event.url.includes('success') || event.url.includes('complete')) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {loading && (
          <View style={[styles.loading, { pointerEvents: 'none' }]}>
            <LoadingSpinner />
          </View>
        )}
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          injectedJavaScript={injectedJavaScript}
          onNavigationStateChange={handleNavigationChange}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
    ...Platform.select({
      web: { backdropFilter: 'blur(2px)' },
    }),
  },
  webview: {
    flex: 1,
  },
});
