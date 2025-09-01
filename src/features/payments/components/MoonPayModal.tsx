import React, { useState } from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Spinner from '@/components/ui/Spinner';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppInfo } from '@/contexts/AppInfoContext';

interface MoonPayModalProps {
  visible: boolean;
  onClose: () => void;
  walletAddress: string;
  coin: 'eth' | 'usdt' | 'usdc' | 'near';
  amountUSD?: number;
  amountNEAR?: number;
}

export default function MoonPayModal({
  visible,
  onClose,
  walletAddress,
  coin,
  amountUSD,
  amountNEAR,
}: MoonPayModalProps) {
  const { colors } = useTheme();
  const { fiatKey, feeAddress, feeBps } = useAppInfo();
  const [loading, setLoading] = useState(true);

  if (!fiatKey) return null;

  const feeParams =
    feeAddress && typeof feeBps === 'number'
      ? `&feeAddress=${encodeURIComponent(feeAddress)}&feeBps=${feeBps}`
      : '';
  const url =
    `https://buy.moonpay.com?apiKey=${fiatKey}&currencyCode=${coin}&walletAddress=${walletAddress}&baseCurrencyCode=usd${feeParams}`;

  let injectedJavaScript: string | undefined;
  if (typeof amountNEAR === 'number') {
    injectedJavaScript = `
    setTimeout(function() {
      var input = document.querySelector('input[name="quote-amount-input"], input[name="quoteAmount"], input[name="digital-amount-input"]');
      if (input) {
        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, '${amountNEAR}');
        var ev = new Event('input', { bubbles: true });
        input.dispatchEvent(ev);
      }
    }, 2500);
    true;
  `;
  } else if (typeof amountUSD === 'number') {
    injectedJavaScript = `
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
  }

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
            <Spinner />
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
    start: 0,
    end: 0,
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
