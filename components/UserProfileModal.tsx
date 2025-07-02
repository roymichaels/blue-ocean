import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { MatrixService } from '../services/matrix';
import DatabaseService from '../services/database';

interface UserProfileModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

export default function UserProfileModal({ visible, userId, onClose }: UserProfileModalProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{ username: string; displayName: string; exists: boolean } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!visible || !userId) return;
      setLoading(true);
      const db = DatabaseService.getInstance();
      let user = await db.getUserProfile(userId);
      const exists = !!user;

      if (!user) {
        const matrixProfile = await MatrixService.getInstance().getProfileInfo(userId);
        if (matrixProfile) {
          user = {
            id: userId,
            username: userId.replace(/^@/, '').split(':')[0],
            displayName: matrixProfile.displayname || userId,
            isAdmin: false,
          } as any;
        }
      }

      if (user) {
        setProfile({
          username: user.username || userId,
          displayName: user.displayName || user.username || userId,
          exists,
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [visible, userId]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={[styles.modalContainer, { backgroundColor: colors.surface.elevated }]}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              {loading ? (
                <ActivityIndicator size="large" color={colors.gold} style={{ margin: 20 }} />
              ) : profile ? (
                <>
                  <Text style={[styles.username, { color: colors.text.primary }]}>@{profile.username}</Text>
                  <Text style={[styles.displayName, { color: colors.text.secondary }]}>{profile.displayName}</Text>
                  <View
                    style={[
                      styles.tag,
                      { backgroundColor: profile.exists ? colors.status.success : colors.status.error },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: colors.text.inverse }]}> 
                      {profile.exists ? 'Exists in Supabase' : 'Matrix only'}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={[styles.displayName, { color: colors.text.primary }]}>User not found</Text>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  displayName: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
