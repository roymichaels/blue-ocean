import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ordersAgent from '@/agents/orders-agent';
import { Order, OrderStatus } from '@/types';

const LABELS: Record<OrderStatus | 'unknown', string> = {
  order_received: 'Escrow funded',
  courier_found: 'Escrow funded',
  courier_picked_up: 'Escrow funded',
  courier_on_way: 'Escrow funded',
  delivered: 'Escrow funded',
  disputed: 'Disputed',
  released: 'Released to seller',
  refunded: 'Refunded to buyer',
  unknown: 'Loading...',
};

interface Props {
  orderId: string;
}

export default function EscrowStatusTracker({ orderId }: Props) {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchOrder = async () => {
      const o = await ordersAgent.get(orderId);
      if (mounted) setOrder(o);
    };
    fetchOrder();
    const sub = (updated: Order) => {
      if (updated.id === orderId) setOrder(updated);
    };
    ordersAgent.subscribe(sub);
    return () => {
      mounted = false;
      ordersAgent.unsubscribe(sub);
    };
  }, [orderId]);

  const status: OrderStatus | 'unknown' = order?.status || 'unknown';
  const label = LABELS[status];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escrow Status</Text>
      <Text style={styles.status}>{label}</Text>
      {order?.escrowAddr && (
        <Text style={styles.address}>Contract: {order.escrowAddr}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  status: { fontSize: 14 },
  address: { fontSize: 12, marginTop: 4 },
});
