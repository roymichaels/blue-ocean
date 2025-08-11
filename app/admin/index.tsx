import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseService from '../../services/database';
import { User } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../components/AuthContext';
import usersAgent from '../../agents/users-agent';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [requests, setRequests] = useState<User[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const db = DatabaseService.getInstance();
    const pending = await db.getPendingKycRequests();
    setRequests(pending);
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
