import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthModal } from '../../components/AuthModalContext';
import { ArrowLeft, Shield, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Clock, ExternalLink } from 'lucide-react-native';
import { useAuth } from '../../components/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import DatabaseService from '../../services/database';
import { KycStatus } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import InfoModal from '../../components/InfoModal';
import ConfirmationModal from '../../components/ConfirmationModal';



const TELEGRAM_LINK = 'https://t.me/+fTyw0RbT2Kk5NTI0';

export default function KycScreen() {
  const { isLoggedIn, user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [kycStatus, setKycStatus] = useState<KycStatus>('none');
  const [requestNotes, setRequestNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { colors } = useTheme();

  // Modal states
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    action: () => {}
  });

  useEffect(() => {
    if (!isLoggedIn) {
      setInfoModal({
        visible: true,
        title: 'נדרשת התחברות',
        message: 'עליך להתחבר כדי לגשת לדף זה',
        type: 'warning'
      });
      return;
    }

    loadKycStatus();
  }, [isLoggedIn, user]);

  const loadKycStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const db = DatabaseService.getInstance();
      const userProfile = await db.getUserProfile(user.id);
      
      if (userProfile && userProfile.kycStatus) {
        setKycStatus(userProfile.kycStatus);
      }
    } catch (error) {
      console.error('Error loading KYC status:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'טעינת סטטוס האימות נכשלה',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const requestVerification = async (skipRequest: boolean = false) => {
    if (!user) return;
    
    setSubmitting(true);
    try {
      const db = DatabaseService.getInstance();
      const success = await db.updateUserKycStatus(
        user.id, 
        'pending', 
        undefined, 
        skipRequest ? 'Skip request: ' + requestNotes : requestNotes
      );
      
      if (success) {
        setKycStatus('pending');
        setInfoModal({
          visible: true,
          title: 'בקשת האימות הוגשה',
          message: 'בקשת האימות שלך הוגשה. נבדוק אותה בהקדם.',
          type: 'success'
        });
      } else {
        setInfoModal({
          visible: true,
          title: 'שגיאה',
          message: 'אירעה שגיאה בהגשת בקשת האימות. אנא נסה שוב מאוחר יותר.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error requesting verification:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אירעה שגיאה בהגשת בקשת האימות. אנא נסה שוב מאוחר יותר.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSkipRequest = () => {
    if (!requestNotes.trim()) {
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אנא הוסף הערות כדי לבקש לדלג על האימות',
        type: 'error'
      });
      return;
    }
    
    setConfirmModal({
      visible: true,
      title: 'בקשה לדלג על אימות',
      message: 'האם אתה בטוח שברצונך לבקש לדלג על תהליך האימות? בקשה זו תיבדק על ידי מנהל.',
      action: () => requestVerification(true)
    });
  };

  const openTelegram = async () => {
    try {
      const supported = await Linking.canOpenURL(TELEGRAM_LINK);
      
      if (supported) {
        await Linking.openURL(TELEGRAM_LINK);
      } else {
        setInfoModal({
          visible: true,
          title: 'לא ניתן לפתוח את הקישור',
          message: 'אנא העתק את הקישור ופתח אותו בדפדפן: ' + TELEGRAM_LINK,
          type: 'info'
        });
      }
    } catch (error) {
      console.error('Error opening Telegram link:', error);
      setInfoModal({
        visible: true,
        title: 'שגיאה',
        message: 'אירעה שגיאה בפתיחת הקישור',
        type: 'error'
      });
    }
  };

  const handleLoginRedirect = () => {
    openAuthModal();
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>אימות KYC</Text>
          <View style={{ width: 24 }} />
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>אימות KYC</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* KYC Status Card */}
        <View style={[styles.statusCard, { 
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary 
        }]}>
          <View style={styles.statusHeader}>
            <Shield size={32} color={colors.gold} />
            <Text style={[styles.statusTitle, { color: colors.text.primary }]}>סטטוס האימות שלך</Text>
          </View>

          <View style={styles.statusContent}>
            {kycStatus === 'none' && (
              <View style={styles.statusInfo}>
                <AlertTriangle size={24} color={colors.status.warning} />
                <Text style={[styles.statusText, { color: colors.text.primary }]}>לא מאומת</Text>
              </View>
            )}

            {kycStatus === 'pending' && (
              <View style={styles.statusInfo}>
                <Clock size={24} color={colors.interactive.primary} />
                <Text style={[styles.statusText, { color: colors.text.primary }]}>אימות בהמתנה</Text>
              </View>
            )}

            {kycStatus === 'verified' && (
              <View style={styles.statusInfo}>
                <CheckCircle size={24} color={colors.status.success} />
                <Text style={[styles.statusText, { color: colors.text.primary }]}>מאומת</Text>
              </View>
            )}

            {kycStatus === 'rejected' && (
              <View style={styles.statusInfo}>
                <AlertTriangle size={24} color={colors.status.error} />
                <Text style={[styles.statusText, { color: colors.text.primary }]}>אימות נדחה</Text>
              </View>
            )}

            <Text style={[styles.statusDescription, { color: colors.text.secondary }]}>
              {kycStatus === 'none' && 'אימות KYC נדרש כדי לבצע הזמנות. אנא השלם את תהליך האימות.'}
              {kycStatus === 'pending' && 'בקשת האימות שלך נמצאת כרגע בבדיקה. נודיע לך ברגע שתעובד.'}
              {kycStatus === 'verified' && 'החשבון שלך מאומת. כעת תוכל לבצע הזמנות ולגשת לכל התכונות.'}
              {kycStatus === 'rejected' && 'בקשת האימות שלך נדחתה. אנא צור קשר עם התמיכה למידע נוסף.'}
            </Text>
          </View>
        </View>

        {/* Telegram Support Card */}
        <View style={[styles.telegramCard, { 
          backgroundColor: colors.interactive.secondary,
          borderColor: colors.gold 
        }]}>
          <Text style={[styles.telegramTitle, { color: colors.text.primary }]}>צור קשר עם התמיכה בטלגרם</Text>
          <Text style={[styles.telegramDescription, { color: colors.text.secondary }]}>
            לאימות מהיר, אנא הצטרף לקבוצת הטלגרם שלנו ופנה לצוות התמיכה.
          </Text>
          <TouchableOpacity style={[styles.telegramButton, { backgroundColor: colors.gold }]} onPress={openTelegram}>
            <ExternalLink size={20} color={colors.text.inverse} />
            <Text style={[styles.telegramButtonText, { color: colors.text.inverse }]}>הצטרף לקבוצת הטלגרם שלנו</Text>
          </TouchableOpacity>
        </View>

        {/* KYC Request Form */}
        {(kycStatus === 'none' || kycStatus === 'rejected') && (
          <View style={[styles.requestCard, { 
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary 
          }]}>
            <Text style={[styles.requestTitle, { color: colors.text.primary }]}>בקש אימות</Text>
            
            <View style={styles.requestForm}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.primary }]}>הערות למנהל (אופציונלי)</Text>
                <TextInput
                  style={[styles.formInput, { 
                    borderColor: colors.border.primary,
                    backgroundColor: colors.surface.secondary,
                    color: colors.text.primary 
                  }]}
                  value={requestNotes}
                  onChangeText={setRequestNotes}
                  placeholder="הסבר מדוע יש לאמת אותך או אם כבר אומתת בעבר"
                  multiline
                  numberOfLines={4}
                  textAlign="right"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>

              <View style={styles.requestButtons}>
                <TouchableOpacity
                  style={[styles.requestButton, { backgroundColor: colors.gold }]}
                  onPress={() => requestVerification(false)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <LoadingSpinner size="small" color={colors.text.inverse} style={styles.buttonSpinner} />
                  ) : (
                    <Text style={[styles.requestButtonText, { color: colors.text.inverse }]}>בקש אימות</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.skipButton, { 
                    backgroundColor: colors.surface.secondary,
                    borderColor: colors.border.primary 
                  }]}
                  onPress={confirmSkipRequest}
                  disabled={submitting || !requestNotes.trim()}
                >
                  <Text style={[styles.skipButtonText, { color: colors.text.primary }]}>בקש לדלג על אימות</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* KYC Information */}
        <View style={[styles.infoCard, { 
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary 
        }]}>
          <Text style={[styles.infoTitle, { color: colors.text.primary }]}>מידע על אימות KYC</Text>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            אימות KYC (Know Your Customer) הוא תהליך שבו אנו מאמתים את זהות הלקוחות שלנו.
            זה נדרש כדי לעמוד בדרישות הרגולטוריות ולהבטיח את בטיחות המשתמשים שלנו.
          </Text>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            לאחר שתגיש את בקשת האימות, צוות התמיכה שלנו יבדוק אותה ויעדכן את הסטטוס שלך.
            תהליך זה עשוי להימשך עד 24 שעות.
          </Text>
        </View>
      </ScrollView>

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => {
          setInfoModal({...infoModal, visible: false});
          if (!isLoggedIn && infoModal.title === 'נדרשת התחברות') {
            handleLoginRedirect();
          }
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="אישור"
        cancelText="ביטול"
        onConfirm={() => {
          confirmModal.action();
          setConfirmModal({...confirmModal, visible: false});
        }}
        onCancel={() => setConfirmModal({...confirmModal, visible: false})}
      />
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
  statusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  statusContent: {
    alignItems: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  telegramCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  telegramTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  telegramDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  telegramButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  telegramButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  requestCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  requestForm: {
    width: '100%',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  requestButtons: {
    gap: 12,
  },
  requestButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSpinner: {
    padding: 0,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 12,
    lineHeight: 24,
  },
});
