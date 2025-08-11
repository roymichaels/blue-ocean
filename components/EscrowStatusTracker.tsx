import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import ordersAgent from '../agents/orders-agent';
import { Order } from '../types';

interface Props {
  orderId: string;
}

export default function EscrowStatusTracker({ orderId }: Props) {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const o = await ordersAgent.get(orderId);
      if (active) setOrder(o);
    };
    load();
    const cb = (o: Order) => {
      if (o.id === orderId) setOrder(o);
    };
    ordersAgent.subscribe(cb);
    return () => {
      active = false;
      ordersAgent.unsubscribe(cb);
    };
  }, [orderId]);

  if (!order) return null;

  let message = 'Awaiting payment';
  if (order.paymentTxHash && order.status === 'order_received') {
    message = 'Escrow funded';
  }
  if (order.status === 'delivered') {
    message = 'Awaiting release';
  } else if (order.status === 'released') {
    message = 'Payment released';
  } else if (order.status === 'refunded') {
    message = 'Payment refunded';
  }

  return (
    <View>
      <Text>{message}</Text>
    </View>
  );
}
