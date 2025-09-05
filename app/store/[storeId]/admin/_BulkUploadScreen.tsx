import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useAppRouter } from '@/services';
import { AdminBulkUploader } from '@/features/products';
import { useAuth } from '@/features/auth/AuthContext';

export default function BulkUploadScreen() {
  const { isAdmin } = useAuth();
  const { replace } = useAppRouter();

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access denied', 'Admins only', [
        { text: 'OK', onPress: () => replace('/') },
      ]);
    }
  }, [isAdmin]);

  if (!isAdmin) return null;

  return <AdminBulkUploader />;
}
