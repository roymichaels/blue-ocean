import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import AdminBulkUploader from '@/features/products/components/AdminBulkUploader';
import { useAuth } from '@/features/auth/AuthContext';

export default function BulkUploadScreen() {
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access denied', 'Admins only', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    }
  }, [isAdmin]);

  if (!isAdmin) return null;

  return <AdminBulkUploader />;
}
