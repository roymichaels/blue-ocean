import { errorLog } from '@/utils/logger';
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppInfo } from '../contexts/AppInfoContext';
import tonAuth, { useTonAddress } from '../services/tonAuth';
import MoonPayModal from './MoonPayModal';

interface MoonPayButtonProps {
  usdAmount: number;
}

export default function MoonPayButton({ usdAmount }: MoonPayButtonProps) {
  const { colors } = useTheme();
  const { fiatKey } = useAppInfo();
  const walletAddress = useTonAddress();
  const [visible, setVisible] = useState(false);
  const [amountTON, setAmountTON] = useState<number | undefined>(undefined);

  if (!fiatKey) return null;

  const handlePress = async () => {
    if (!walletAddress) {
      await tonAuth.openModal();
      return;
    }
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd',
      );
      const data = await res.json();
      const tonPrice = data['the-open-network']?.usd;
      if (tonPrice) {
        const amount = usdAmount / tonPrice;
        setAmountTON(Number(amount.toFixed(2)));
      } else {
        setAmountTON(undefined);
      }
    } catch (err) {
      errorLog('Error fetching TON price:', err);
      setAmountTON(undefined);
    }
    setVisible(true);
  };

  return (
    <>
      <TouchableOpacity
        testID="moonpay-button"
        style={[styles.button, { backgroundColor: colors.gold }]}
        onPress={handlePress}
      >
        <Text style={[styles.text, { color: colors.text.inverse }]}>Buy TON</Text>
      </TouchableOpacity>
      <MoonPayModal
        visible={visible}
        onClose={() => setVisible(false)}
        walletAddress={walletAddress!}
        coin="ton"
        amountTON={amountTON}
        amountUSD={amountTON ? undefined : usdAmount}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

