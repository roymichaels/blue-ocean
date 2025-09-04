import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import useAppRouter from 'hooks/useAppRouter';
import { z } from 'zod';
import { createValidateParams } from '@/lib/validateParams';
import { ArrowLeft, User as UserIcon, Mail, Calendar, Shield, MessageCircle } from 'lucide-react-native';
import DatabaseService from '@/services/database';
import { User } from '../../types';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import commonStyles from '@/constants/styles';
import SmartImage from '../../components/SmartImage';

const validateParams = createValidateParams(z.object({ id: z.string() }));



export default function UserProfileScreen() {
  const { back } = useAppRouter();
  const params = validateParams(useLocalSearchParams());
  const id = params.success ? params.data.id : undefined;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isDriver } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isAdmin && !isDriver) {
      back();
      return;
    }
    if (!id) return;
    loadUserProfile();
  }, [id, isAdmin, isDriver]);

  const loadUserProfile = async () => {
    if (!id) return;
    
    try {
      const db = DatabaseService.getInstance();
      const userProfile = await db.getUserProfile(decodeURIComponent(id as string));
      setUser(userProfile);
    } catch (error) {
      errorLog('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!params.success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <Text style={{ color: colors.text.primary }}>Invalid user</Text>
      </SafeAreaView>
    );
  }

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

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return colors.gold;
      case 'driver':
        return colors.status.warning;
      case 'user':
        return colors.interactive.primary;
      default:
        return colors.text.secondary;
    }
  };

  const getRoleText = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'מנהל';
      case 'driver':
        return 'נהג';
      case 'user':
        return 'משתמש';
      default:
        return 'לא ידוע';
    }
  };

  const handleSendMessage = () => {
    if (!user) return;
    
    try {
      // Close this screen
      back();

      // Messaging via Matrix is currently disabled and tracked separately.
      // TODO: re-enable Matrix later
    } catch (error) {
      errorLog('Error opening chat:', error);
      Alert.alert('שגיאה', "אירעה שגיאה בפתיחת הצ'אט");
    }
  };

  if (!isAdmin && !isDriver) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>טוען...</Text>
          <View style={commonStyles.spacer24} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <TouchableOpacity onPress={() => back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>משתמש לא נמצא</Text>
          <View style={commonStyles.spacer24} />
        </View>
        <View style={styles.errorContainer}>
          <UserIcon size={80} color={colors.interactive.disabled} />
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>משתמש לא נמצא</Text>
          <Text style={[styles.errorMessage, { color: colors.text.secondary }]}>
            לא ניתן למצוא את פרטי המשתמש המבוקש
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
        <TouchableOpacity onPress={() => back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>פרופיל משתמש</Text>
        <View style={commonStyles.spacer24} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Avatar and Basic Info */}
        <View style={[styles.profileHeader, { borderBottomColor: colors.border.primary }]}>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <SmartImage
                uri={user.avatar}
                width={100}
                height={100}
                style={[styles.avatar, { borderColor: colors.gold }]}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}>
                <UserIcon size={40} color={colors.interactive.disabled} />
              </View>
            )}
          </View>
          
          <Text style={[styles.displayName, { color: colors.text.primary }]}>{user.displayName}</Text>
          <Text style={[styles.username, { color: colors.text.secondary }]}>@{user.username}</Text>
          
          <View style={[styles.roleBadge, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}>
            <Shield size={16} color={getRoleColor(user.role)} />
            <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
              {getRoleText(user.role)}
            </Text>
          </View>
        </View>

        {/* User Details */}
        <View style={styles.detailsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>פרטי משתמש</Text>
          
          <View style={[styles.detailItem, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.interactive.secondary }]}>
              <UserIcon size={20} color={colors.gold} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>מזהה משתמש</Text>
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{user.id}</Text>
            </View>
          </View>

          <View style={[styles.detailItem, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.interactive.secondary }]}>
              <Mail size={20} color={colors.gold} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>כתובת אימייל</Text>
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{user.email || 'לא זמין'}</Text>
            </View>
          </View>

          <View style={[styles.detailItem, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.interactive.secondary }]}>
              <Calendar size={20} color={colors.gold} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>תאריך הצטרפות</Text>
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{formatDate(user.createdAt)}</Text>
            </View>
          </View>

          <View style={[styles.detailItem, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.interactive.secondary }]}>
              <Calendar size={20} color={colors.gold} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>עדכון אחרון</Text>
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{formatDate(user.updatedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>פעולות</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.surface.primary, borderColor: colors.gold }]}
            onPress={handleSendMessage}
          >
            <MessageCircle size={20} color={colors.gold} />
            <Text style={[styles.actionButtonText, { color: colors.gold }]}>שלח הודעה</Text>
          </TouchableOpacity>
        </View>

        {/* Account Status */}
        <View style={styles.statusContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>סטטוס חשבון</Text>
          
          <View style={[styles.statusItem, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}>
            <View style={[styles.statusIndicator, { backgroundColor: colors.status.success }]} />
            <Text style={[styles.statusText, { color: colors.text.primary }]}>חשבון פעיל</Text>
          </View>
          
          <View style={[styles.statusItem, { backgroundColor: colors.surface.primary, borderColor: colors.border.primary }]}>
            <View style={[styles.statusIndicator, { backgroundColor: colors.gold }]} />
            <Text style={[styles.statusText, { color: colors.text.primary }]}>אימייל מאומת</Text>
          </View>
        </View>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'right',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusContainer: {
    marginBottom: 24,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    justifyContent: 'flex-end',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
