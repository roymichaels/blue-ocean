import { errorLog } from '@/utils/logger';
import React, { useState } from 'react';
import { Button } from '@/ui';
import { useAppInfo } from '@/contexts/AppInfoContext';
import { useWallet } from '@/contexts/WalletProvider';
import MoonPayModal from './MoonPayModal';

interface MoonPayButtonProps {
  usdAmount: number;
}

export default function MoonPayButton({ usdAmount }: MoonPayButtonProps) {
  const { fiatKey } = useAppInfo();
  const { address: walletAddress, connect } = useWallet();
  const [visible, setVisible] = useState(false);
  const [amountNEAR, setAmountNEAR] = useState<number | undefined>(undefined);

  if (!fiatKey) return null;

  const handlePress = async () => {
    if (!walletAddress) {
      await connect();
      return;
    }
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd',
      );
      const data = await res.json();
      const nearPrice = data['near']?.usd;
      if (nearPrice) {
        const amount = usdAmount / nearPrice;
        setAmountNEAR(Number(amount.toFixed(2)));
      } else {
        setAmountNEAR(undefined);
      }
    } catch (err) {
      errorLog('Error fetching NEAR price:', err);
      setAmountNEAR(undefined);
    }
    setVisible(true);
  };

  return (
    <>
      <Button
        testID="moonpay-button"
        title="Buy NEAR"
        onPress={handlePress}
        style={{ marginTop: 16 }}
      />
      <MoonPayModal
        visible={visible}
        onClose={() => setVisible(false)}
        walletAddress={walletAddress!}
        coin="near"
        amountNEAR={amountNEAR}
        amountUSD={amountNEAR ? undefined : usdAmount}
      />
    </>
  );
}

