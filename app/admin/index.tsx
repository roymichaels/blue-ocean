import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseService from '../../services/database';
import { User, Order } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../components/AuthContext';
import usersAgent from '../../agents/users-agent';
import ordersAgent from '../../agents/orders-agent';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [requests, setRequests] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const db = DatabaseService.getInstance();
    const pending = await db.getPendingKycRequests();
    setRequests(pending);
    const allOrders = await ordersAgent.getAll();
    const pendingOrders = allOrders.filter(
      o =>
        o.paymentMethod === 'ton' &&
        (o.escrowAddr || o.paymentContractAddress) &&
        o.status !== 'released' &&
        o.status !== 'refunded',
    );
    setOrders(pendingOrders);
  };

  const approve = async (id: string) => {
    await usersAgent.handleMessage({
      type: 'kyc.update',
      payload: { userId: id, status: 'verified', adminId: user?.id },
    });
    setRequests(req => req.filter(r => r.id !== id));
  };

  const reject = async (id: string) => {
    await usersAgent.handleMessage({
      type: 'kyc.update',
      payload: { userId: id, status: 'rejected', adminId: user?.id },
    });
    setRequests(req => req.filter(r => r.id !== id));
  };

  const release = async (id: string) => {
    await ordersAgent.releasePayment(id);
    await load();
  };

  const refund = async (id: string) => {
    await ordersAgent.refundPayment(id);
    await load();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Pending KYC Requests</Text>
        {requests.map(r => (
          <View key={r.id} style={[styles.card, { borderColor: colors.border.primary }]}> 
            <Text style={[styles.name, { color: colors.text.primary }]}>{r.displayName}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.status.success }]}
                onPress={() => approve(r.id)}
              >
                <Text style={{ color: colors.text.inverse }}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.status.error }]}
                onPress={() => reject(r.id)}
              >
                <Text style={{ color: colors.text.inverse }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {requests.length === 0 && (
          <Text style={[styles.empty, { color: colors.text.secondary }]}>No pending requests.</Text>
        )}

        <Text style={[styles.title, { color: colors.text.primary }]}>Pending Paid Orders</Text>
        {orders.map(o => (
          <View key={o.id} style={[styles.card, { borderColor: colors.border.primary }]}>
            <Text style={[styles.name, { color: colors.text.primary }]}>Order #{o.id}</Text>
            <Text style={[styles.name, { color: colors.text.secondary }]}>Total: {o.total}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.status.success }]}
                onPress={() => release(o.id)}
              >
                <Text style={{ color: colors.text.inverse }}>Release</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.status.error }]}
                onPress={() => refund(o.id)}
              >
                <Text style={{ color: colors.text.inverse }}>Refund</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {orders.length === 0 && (
          <Text style={[styles.empty, { color: colors.text.secondary }]}>No pending orders.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  name: { fontSize: 16, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, padding: 8, borderRadius: 6, alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 40 },
});
