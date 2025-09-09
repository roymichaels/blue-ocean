import React, { useState } from 'react';
import { Button } from '@/ui';
import { chainAdapter } from '@/services/chain';
import { useWallet } from '@/contexts/WalletProvider';

interface PayPrivatelyButtonProps {
  listingId: number;
  amountYocto: string;
  onComplete?: () => void;
}

export default function PayPrivatelyButton({ listingId, amountYocto, onComplete }: PayPrivatelyButtonProps) {
  const { address: accountId, connect } = useWallet();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (!accountId) {
      await connect();
      return;
    }
    try {
      setLoading(true);
      await chainAdapter.payPrivately?.({ id: listingId, buyer: accountId, amountYocto });
      onComplete?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      testID="pay-privately-button"
      title="Pay Privately"
      onPress={handlePress}
      disabled={loading}
      loading={loading}
      style={{ marginTop: 16 }}
    />
  );
}

