import React, { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/ui';
import { Spinner } from '@/ui/primitives';
import OrderService from '@/services/orders';

interface Props {
  orderId: string;
}

export default function DisputeResolver({ orderId }: Props) {
  const [loading, setLoading] = useState(false);

  const resolve = async (toSeller: boolean) => {
    setLoading(true);
    try {
      await OrderService.getInstance().resolveDispute(orderId, toSeller);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View>
        <Spinner />
      </View>
    );
  }

  return (
    <View>
      <Button title="Release to Seller" onPress={() => resolve(true)} />
      <Button title="Refund Buyer" onPress={() => resolve(false)} />
    </View>
  );
}
