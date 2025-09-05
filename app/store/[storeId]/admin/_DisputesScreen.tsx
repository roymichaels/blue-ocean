import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import { useAuth } from '@/features/auth/AuthContext';
import { useAppRouter } from '@/services';
import ordersAgent from '../../../../agents/orders-agent';
import { Order } from '../../../../types';
import DisputeEvidence from '../../../../components/DisputeEvidence';
import DisputeResolver from '../../../../components/DisputeResolver';
import commonStyles from '@/constants/styles';
import { t } from '@/i18n';

export default function AdminDisputesScreen() {
  const { colors } = useTheme();
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const { replace, back } = useAppRouter();

  useEffect(() => {
    if (!isAdmin) {
      replace('/');
      return;
    }
    const load = async () => {
      const all = await ordersAgent.getAll();
      setOrders(all.filter(o => o.status === 'disputed'));
    };
    load();
    const sub = async (o: Order) => {
      if (o.status === 'disputed') {
        load();
      } else {
        setOrders(prev => prev.filter(ord => ord.id !== o.id));
      }
    };
    ordersAgent.subscribe(sub);
    return () => ordersAgent.unsubscribe(sub);
  }, [isAdmin]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.primary,
        }}
      >
        <TouchableOpacity onPress={() => back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, color: colors.text.primary }}>
          {t('disputes.title')}
        </Text>
        <View style={commonStyles.spacer24} />
      </View>
      <ScrollView style={{ padding: 16 }}>
        {orders.map(order => (
          <View
            key={order.id}
            style={{
              marginBottom: 24,
              borderWidth: 1,
              borderColor: colors.border.primary,
              padding: 16,
            }}
          >
            <Text style={{ color: colors.text.primary }}>
              {t('orders.orderNumber', { id: order.id })}
            </Text>
            <DisputeEvidence uri={order.disputeEvidenceUri} />
            <DisputeResolver orderId={order.id} />
          </View>
        ))}
        {orders.length === 0 && (
          <Text style={{ color: colors.text.secondary }}>{t('disputes.noDisputes')}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
