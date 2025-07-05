import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Truck, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import { useAuth } from '../components/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseService from '../services/database';
import { DeliveryJob } from '../types';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function DriverDashboardScreen() {
  const { user, isDriver, isAdmin } = useAuth();
  const { colors } = useTheme();
  const [jobs, setJobs] = useState<DeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isDriver && !isAdmin) {
      router.replace('/');
      return;
    }
    loadJobs();
  }, [isDriver, isAdmin]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      const data = isAdmin && !isDriver
        ? await db.getAllDeliveryJobs()
        : await db.getDeliveryJobsForDriver(user?.id || '');
      setJobs(data);
    } catch (error) {
      console.error('Error loading jobs:', error);
      Alert.alert('שגיאה', 'טעינת המשימות נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (jobId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const db = DatabaseService.getInstance();
      await db.updateDeliveryJobStatus(jobId, status);
      loadJobs();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('שגיאה', 'עדכון סטטוס נכשל');
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '';
    return new Date(value).toLocaleString('he-IL');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>משימות משלוח</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {jobs.map(job => (
          <View key={job.id} style={[styles.jobCard, {
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary,
          }]}>
            <View style={styles.jobHeader}>
              <Truck size={24} color={colors.gold} />
              <Text style={[styles.jobTitle, { color: colors.text.primary }]}>הזמנה #{job.orderId.slice(-6)}</Text>
            </View>
            <Text style={[styles.jobStatus, { color: colors.text.secondary }]}>סטטוס: {job.status}</Text>
            {job.pickupTime && (
              <Text style={[styles.jobInfo, { color: colors.text.secondary }]}>איסוף: {formatDate(job.pickupTime)}</Text>
            )}
            {job.dropoffTime && (
              <Text style={[styles.jobInfo, { color: colors.text.secondary }]}>מסירה: {formatDate(job.dropoffTime)}</Text>
            )}
            <View style={styles.actionsRow}>
              {job.status !== 'in_progress' && job.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.border.primary }]}
                  onPress={() => updateStatus(job.id, 'in_progress')}
                >
                  <Clock size={20} color={colors.text.primary} />
                  <Text style={[styles.actionText, { color: colors.text.primary }]}>התחל</Text>
                </TouchableOpacity>
              )}
              {job.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.border.primary }]}
                  onPress={() => updateStatus(job.id, 'completed')}
                >
                  <CheckCircle size={20} color={colors.text.primary} />
                  <Text style={[styles.actionText, { color: colors.text.primary }]}>הושלם</Text>
                </TouchableOpacity>
              )}
              {job.status !== 'cancelled' && job.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.border.primary }]}
                  onPress={() => updateStatus(job.id, 'cancelled')}
                >
                  <XCircle size={20} color={colors.text.primary} />
                  <Text style={[styles.actionText, { color: colors.text.primary }]}>בטל</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        {!loading && jobs.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>אין משימות</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  jobCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  jobHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: { fontSize: 16, marginRight: 8 },
  jobStatus: { fontSize: 14, marginBottom: 4, textAlign: 'right' },
  jobInfo: { fontSize: 14, marginBottom: 4, textAlign: 'right' },
  actionsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  actionText: { marginHorizontal: 4, fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 32 },
  emptyText: { fontSize: 16 },
});
