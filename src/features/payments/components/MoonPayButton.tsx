import { errorLog } from '@/utils/logger';
import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { useAppInfo } from '@/contexts/AppInfoContext';
import near, { useNearAccount } from '@/services/near';
import MoonPayModal from './MoonPayModal';

interface MoonPayButtonProps {
  usdAmount: number;
}

export default function MoonPayButton({ usdAmount }: MoonPayButtonProps) {
  const { fiatKey } = useAppInfo();
  const walletAddress = useNearAccount();
  const [visible, setVisible] = useState(false);
  const [amountTON, setAmountTON] = useState<number | undefined>(undefined);

  if (!fiatKey) return null;

  const handlePress = async () => {
    if (!walletAddress) {
      await near.openModal();
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
      <Button
        testID="moonpay-button"
        title="Buy TON"
        onPress={handlePress}
        style={{ marginTop: 16 }}
      />
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

