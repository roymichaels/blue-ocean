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
import { useTheme } from '@/contexts/ThemeContext';
import DatabaseService from '@/services/database';

interface UserProfileModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  isAdmin?: boolean;
  onMessage?: (id: string, name: string) => void;
}

export default function UserProfileModal({ visible, userId, onClose, isAdmin = false, onMessage }: UserProfileModalProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{ username: string; displayName: string; exists: boolean } | null>(null);
  const [orders, setOrders] = useState<{ id: string; total: number; status: string; createdAt: string }[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!visible || !userId) return;
      setLoading(true);
      const db = DatabaseService.getInstance();
      let user = await db.getUserProfile(userId);
      const exists = !!user;

      if (user) {
        setProfile({
          username: user.username || userId,
          displayName: user.displayName || user.username || userId,
          exists,
        });
        if (isAdmin) {
          const userOrders = await db.getUserOrders(user.id);
          setOrders(userOrders);
        } else {
          setOrders([]);
        }
      } else {
        setProfile(null);
        setOrders([]);
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
                <ActivityIndicator size="large" color={colors.gold} style={styles.loader} />
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
                      {profile.exists ? 'Exists locally' : 'Matrix only'}
                    </Text>
                  </View>
                  {isAdmin && orders.length > 0 && (
                    <View style={styles.ordersSection}>
                      <Text style={[styles.ordersTitle, { color: colors.text.primary }]}>Previous Orders</Text>
                      {orders.slice(0, 5).map((o) => (
                        <View key={o.id} style={styles.orderItem}>
                          <Text style={[styles.orderId, { color: colors.text.primary }]}>#{o.id.slice(-6)}</Text>
                          <Text style={[styles.orderTotal, { color: colors.text.secondary }]}>₪{o.total.toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {isAdmin && onMessage && (
                    <TouchableOpacity
                      style={[styles.messageButton, { backgroundColor: colors.gold }]}
                      onPress={() => onMessage(userId, profile.displayName)}
                    >
                      <Text style={[styles.messageButtonText, { color: colors.text.inverse }]}>Message</Text>
                    </TouchableOpacity>
                  )}
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
      ios: { elevation: 5 },
      android: { elevation: 5 },
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)' },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    end: 12,
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
  loader: {
    margin: 20,
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
  ordersSection: {
    width: '100%',
    marginTop: 16,
  },
  ordersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderTotal: {
    fontSize: 14,
  },
  messageButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
