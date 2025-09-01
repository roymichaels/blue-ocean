import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppRouter from 'hooks/useAppRouter';
import { ArrowLeft, CircleCheck as CheckCircle, Circle as XCircle, Clock, User, Mail, FileText, Calendar } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import DatabaseService from '../../../../services/database';
import { User as UserType } from '../../../../types';
import Spinner from '../../../../components/ui/Spinner';
import commonStyles from '@/constants/styles';
import SmartImage from '../../../../components/SmartImage';



export default function KycApprovalsScreen() {
  const [pendingRequests, setPendingRequests] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isDriver, user } = useAuth();
  const { colors } = useTheme();
  const { replace, back } = useAppRouter();

  useEffect(() => {
    if (!isAdmin && !isDriver) {
      Alert.alert('גישה מוגבלת', 'רק מנהלים יכולים לגשת לדף זה', [
        { text: 'אישור', onPress: () => replace('/') }
      ]);
      return;
    }

    loadPendingRequests();
  }, [isAdmin, isDriver]);

  const loadPendingRequests = async () => {
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      const requests = await db.getPendingKycRequests();
      setPendingRequests(requests);
    } catch (error) {
      errorLog('Error loading pending KYC requests:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בטעינת בקשות האימות');
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (userId: string) => {
    if (!user) return;
    
    try {
      const db = DatabaseService.getInstance();
      const success = await db.updateUserKycStatus(userId, 'verified', user.id);
      
      if (success) {
        // Update local state
        setPendingRequests(prev => prev.filter(req => req.id !== userId));
        Alert.alert('הצלחה', 'אימות KYC אושר בהצלחה');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה באישור האימות');
      }
    } catch (error) {
      errorLog('Error approving KYC request:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה באישור האימות');
    }
  };

  const rejectRequest = async (userId: string) => {
    if (!user) return;
    
    try {
      const db = DatabaseService.getInstance();
      const success = await db.updateUserKycStatus(userId, 'rejected', user.id);
      
      if (success) {
        // Update local state
        setPendingRequests(prev => prev.filter(req => req.id !== userId));
        Alert.alert('הצלחה', 'אימות KYC נדחה');
      } else {
        Alert.alert('שגיאה', 'אירעה שגיאה בדחיית האימות');
      }
    } catch (error) {
      errorLog('Error rejecting KYC request:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בדחיית האימות');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'לא זמין';
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>אישורי KYC</Text>
          <View style={commonStyles.spacer24} />
        </View>
        <Spinner label="Loading KYC approvals" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={() => back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>אישורי KYC</Text>
        <View style={commonStyles.spacer24} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <Clock size={24} color={colors.gold} />
          <Text style={[styles.title, { color: colors.text.primary }]}>בקשות אימות KYC ממתינות</Text>
        </View>

        {pendingRequests.length > 0 ? (
          <View style={styles.requestsList}>
            {pendingRequests.map((request) => (
              <View key={request.id} style={[styles.requestCard, { 
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary 
              }]}>
                <View style={styles.userInfo}>
                  <View style={styles.avatarContainer}>
                    {request.avatar ? (
                      <SmartImage
                        uri={request.avatar}
                        width={60}
                        height={60}
                        style={[styles.avatar, { borderColor: colors.gold }]}
                      />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { 
                        backgroundColor: colors.surface.secondary,
                        borderColor: colors.border.primary 
                      }]}>
                        <User size={24} color={colors.interactive.disabled} />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.userDetails}>
                    <Text style={[styles.userName, { color: colors.text.primary }]}>{request.displayName}</Text>
                    <View style={styles.userDetailRow}>
                      <User size={14} color={colors.text.secondary} />
                      <Text style={[styles.userDetailText, { color: colors.text.secondary }]}>@{request.username}</Text>
                    </View>
                    <View style={styles.userDetailRow}>
                      <Mail size={14} color={colors.text.secondary} />
                      <Text style={[styles.userDetailText, { color: colors.text.secondary }]}>{request.email}</Text>
                    </View>
                    <View style={styles.userDetailRow}>
                      <Calendar size={14} color={colors.text.secondary} />
                      <Text style={[styles.userDetailText, { color: colors.text.secondary }]}>
                        בקשה מ: {formatDate(request.kycRequestedAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {request.kycRequestNotes && (
                  <View style={[styles.notesContainer, { backgroundColor: colors.surface.secondary }]}>
                    <View style={styles.notesHeader}>
                      <FileText size={16} color={colors.gold} />
                      <Text style={[styles.notesTitle, { color: colors.text.primary }]}>הערות המשתמש:</Text>
                    </View>
                    <Text style={[styles.notesText, { color: colors.text.secondary }]}>{request.kycRequestNotes}</Text>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.approveButton, { backgroundColor: colors.status.success }]}
                    onPress={() => approveRequest(request.id)}
                  >
                    <CheckCircle size={20} color={colors.text.inverse} />
                    <Text style={[styles.approveButtonText, { color: colors.text.inverse }]}>אשר</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.rejectButton, { backgroundColor: colors.status.error }]}
                    onPress={() => rejectRequest(request.id)}
                  >
                    <XCircle size={20} color={colors.text.inverse} />
                    <Text style={[styles.rejectButtonText, { color: colors.text.inverse }]}>דחה</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <CheckCircle size={80} color={colors.interactive.disabled} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>אין בקשות אימות ממתינות</Text>
            <Text style={[styles.emptyMessage, { color: colors.text.secondary }]}>
              כל בקשות האימות טופלו. בדוק שוב מאוחר יותר.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  requestsList: {
    gap: 16,
  },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    borderRadius: 30,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'end',
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  userDetailText: {
    fontSize: 14,
    marginRight: 6,
  },
  notesContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'flex-end',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'end',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
