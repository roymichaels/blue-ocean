import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { chainAdapter } from '@/services/chain';

interface PayPrivatelyButtonProps {
  listingId: number;
  amountYocto: string;
  onComplete?: () => void;
}

export default function PayPrivatelyButton({ listingId, amountYocto, onComplete }: PayPrivatelyButtonProps) {
  const accountId = chainAdapter.useAccount();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (!accountId) {
      await chainAdapter.openModal();
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

