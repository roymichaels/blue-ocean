import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Button from '@/ui/primitives/Button';
import OrderService from '../services/orders';

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
        <ActivityIndicator />
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
