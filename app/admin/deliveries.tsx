import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Truck, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import DatabaseService from '../../services/database';
import { DeliveryJob, User } from '../../types';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function AdminDeliveriesScreen() {
  const { isAdmin } = useAuth();
  const { colors } = useTheme();
  const [jobs, setJobs] = useState<DeliveryJob[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [orderId, setOrderId] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/');
      return;
    }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      const [allJobs, users] = await Promise.all([
        db.getAllDeliveryJobs(),
        db.getAllUserProfiles(),
      ]);
      setJobs(allJobs);
      setDrivers(users.filter(u => u.role === 'driver'));
    } catch (error) {
      console.error('Error loading deliveries:', error);
      Alert.alert('שגיאה', 'טעינת המשלוחים נכשלה');
    } finally {
      setLoading(false);
    }
  };

  const createJob = async () => {
    try {
      if (!orderId || !selectedDriver) return;
      const db = DatabaseService.getInstance();
      await db.createDeliveryJob(orderId, selectedDriver.id);
      setOrderId('');
      setSelectedDriver(null);
      setShowDriverDropdown(false);
      loadData();
    } catch (error) {
      console.error('Error creating job:', error);
      Alert.alert('שגיאה', 'יצירת המשימה נכשלה');
    }
  };

  const updateStatus = async (jobId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const db = DatabaseService.getInstance();
      await db.updateDeliveryJobStatus(jobId, status);
      loadData();
    } catch (error) {
      console.error('Error updating job:', error);
      Alert.alert('שגיאה', 'עדכון סטטוס נכשל');
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleString('he-IL');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>משלוחים</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.newJob, { borderColor: colors.border.primary }]}>
          <TextInput
            style={[styles.input, { color: colors.text.primary, borderColor: colors.border.primary }]}
            placeholder="Order ID"
            placeholderTextColor={colors.text.secondary}
            value={orderId}
            onChangeText={setOrderId}
          />
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[styles.dropdown, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}
              onPress={() => setShowDriverDropdown(!showDriverDropdown)}
            >
              <Text style={[styles.dropdownText, { color: colors.text.primary }]}>
                {selectedDriver?.displayName || 'בחר נהג'}
              </Text>
              <ChevronDown size={20} color={colors.text.secondary} />
            </TouchableOpacity>
            {showDriverDropdown && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}>
                {drivers.map(driver => (
                  <TouchableOpacity
                    key={driver.id}
                    style={[styles.dropdownItem, selectedDriver?.id === driver.id && { backgroundColor: colors.interactive.secondary }]}
                    onPress={() => { setSelectedDriver(driver); setShowDriverDropdown(false); }}
                  >
                    <Text style={[styles.dropdownItemText, { color: colors.text.primary }]}>{driver.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.gold }]} onPress={createJob}>
            <Plus size={20} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>

        {jobs.map(job => (
          <View key={job.id} style={[styles.jobCard, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}>
            <View style={styles.jobHeader}>
              <Truck size={24} color={colors.gold} />
              <Text style={[styles.jobTitle, { color: colors.text.primary }]}>הזמנה #{job.orderId.slice(-6)}</Text>
            </View>
            <Text style={[styles.jobInfo, { color: colors.text.secondary }]}>נהג: {drivers.find(d => d.id === job.driverId)?.displayName || job.driverId}</Text>
            <Text style={[styles.jobInfo, { color: colors.text.secondary }]}>סטטוס: {job.status}</Text>
            {job.pickupTime && <Text style={[styles.jobInfo, { color: colors.text.secondary }]}>איסוף: {formatDate(job.pickupTime)}</Text>}
            {job.dropoffTime && <Text style={[styles.jobInfo, { color: colors.text.secondary }]}>מסירה: {formatDate(job.dropoffTime)}</Text>}
            <View style={styles.actionsRow}>
              {job.status !== 'in_progress' && job.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.border.primary }]}
                  onPress={() => updateStatus(job.id, 'in_progress')}
                >
                  <Text style={[styles.actionText, { color: colors.text.primary }]}>התחל</Text>
                </TouchableOpacity>
              )}
              {job.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.border.primary }]}
                  onPress={() => updateStatus(job.id, 'completed')}
                >
                  <Text style={[styles.actionText, { color: colors.text.primary }]}>הושלם</Text>
                </TouchableOpacity>
              )}
              {job.status !== 'cancelled' && job.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.border.primary }]}
                  onPress={() => updateStatus(job.id, 'cancelled')}
                >
                  <Text style={[styles.actionText, { color: colors.text.primary }]}>בטל</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
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
  newJob: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  dropdownContainer: {
    flex: 1,
    position: 'relative',
  },
  dropdown: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dropdownText: { fontSize: 14 },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 1000,
  },
  dropdownItem: { padding: 8 },
  dropdownItemText: { fontSize: 14, textAlign: 'right' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
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
  jobInfo: { fontSize: 14, marginBottom: 4, textAlign: 'right' },
  actionsRow: {
    flexDirection: 'row-reverse',
    marginTop: 8,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  actionText: { fontSize: 14 },
});
