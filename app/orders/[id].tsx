import { debugLog } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Button from '@/ui/primitives/Button';
import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { createValidateParams } from '@/lib/validateParams';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '@/features/auth/AuthContext';
import GlobalHeader from '../../components/GlobalHeader';
import InfoModal from '../../components/InfoModal';
import OrderService from '../../services/orders';
import { Order, OrderStatus, ShippingAddress } from '../../types';
import { ALLOWED_STATUS_TRANSITIONS } from '../../agents/orders-agent';
import nearAuth from '@/features/auth/services/nearAuth';
import { decryptOrderShipping } from '@/features/stores/services/sellerTools';

const validateParams = createValidateParams(z.object({ id: z.string() }));

export default function OrderDetailScreen() {
  const params = validateParams(useLocalSearchParams());
  const id = params.success ? params.data.id : undefined;
  const { colors } = useTheme();
  const { user, isDriver } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const svc = OrderService.getInstance();
      const raw: any = await svc.getOrder(id);
      let decrypted = raw as Order | null;
      if (raw && raw.shipAddrEnc && isSeller) {
        try {
          const sig = await nearAuth.signMessage(Buffer.from(raw.id));
          if (sig) {
            const addr = await decryptOrderShipping(raw);
            if (addr) {
              raw.shippingAddress = addr;
              decrypted = raw as Order;
            }
          }
        } catch (err) {
          debugLog('Failed to decrypt shipping address', err);
        }
      }
      setOrder(decrypted);
    };
    load();
  }, [id]);

  const address = user?.address;
  const isSeller = !!address && order?.sellerAddress === address;
  const canUpdate = !!order && (isSeller || isDriver);
  const nextStatuses: OrderStatus[] = order ? ALLOWED_STATUS_TRANSITIONS[order.status] || [] : [];

  if (!params.success) {
    return <Text>Invalid order</Text>;
  }

  const statusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'order_received':
        return 'הזמנה התקבלה';
      case 'courier_found':
        return 'נמצא שליח';
      case 'courier_picked_up':
        return 'שליח אסף';
      case 'courier_on_way':
        return 'שליח בדרך';
      case 'delivered':
        return 'הזמנה נמסרה';
      case 'released':
        return 'תשלום שוחרר';
      case 'refunded':
        return 'תשלום הוחזר';
      default:
        return status;
    }
  };

  const handleUpdate = async (status: OrderStatus) => {
    if (!order) return;
    try {
      const svc = OrderService.getInstance();
      await svc.updateOrderStatus(order.id, status);
      const updated = await svc.getOrder(order.id);
      setOrder(updated);
      setInfoModal({ visible: true, title: 'עודכן', message: 'סטטוס ההזמנה עודכן', type: 'success' });
    } catch (e) {
      setInfoModal({ visible: true, title: 'שגיאה', message: 'עדכון הסטטוס נכשל', type: 'error' });
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}> 
      <GlobalHeader title={`הזמנה #${id}`} showBackButton />
      {order && (
        <View style={styles.content}>
          <Text style={[styles.status, { color: colors.text.primary }]}>סטטוס נוכחי: {statusLabel(order.status)}</Text>
          {isSeller && (order.shippingAddress as ShippingAddress | undefined) && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.text.primary, textAlign: 'right' }}>
                {(order.shippingAddress as ShippingAddress).name}
              </Text>
              <Text style={{ color: colors.text.primary, textAlign: 'right' }}>
                {(order.shippingAddress as ShippingAddress).street}
              </Text>
              <Text style={{ color: colors.text.primary, textAlign: 'right' }}>
                {(order.shippingAddress as ShippingAddress).city}{' '}
                {(order.shippingAddress as ShippingAddress).postalCode}
              </Text>
              <Text style={{ color: colors.text.primary, textAlign: 'right' }}>
                {(order.shippingAddress as ShippingAddress).phone}
              </Text>
              {(order.shippingAddress as ShippingAddress).notes && (
                <Text style={{ color: colors.text.primary, textAlign: 'right' }}>
                  הערות: {(order.shippingAddress as ShippingAddress).notes}
                </Text>
              )}
            </View>
          )}
          {canUpdate && nextStatuses.length > 0 && (
            <View style={styles.actions}>
              {nextStatuses.map((s) => (
                <Button
                  key={s}
                  title={statusLabel(s)}
                  onPress={() => handleUpdate(s)}
                  accessibilityRole="button"
                />
              ))}
            </View>
          )}
        </View>
      )}
      {!order && (
        <Text style={{ color: colors.text.primary, textAlign: 'center' }}>הזמנה לא נמצאה</Text>
      )}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  status: { fontSize: 18, fontWeight: '600', textAlign: 'right', marginBottom: 24 },
  actions: { gap: 12 },
});

