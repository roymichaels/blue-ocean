import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import useRequirePlatformAdmin from 'hooks/useRequirePlatformAdmin';
import chain from '@/services/chain';
import { Store } from '@/types';
import AdminShell from '@/components/admin/AdminShell';
import AdminList, { AdminListItem } from '@/components/admin/AdminList';

let listStores: (() => Promise<Store[]>) | undefined;
if (chain === 'near') {
  ({ listStores } = require('@/features/stores/services/nearStores'));
}

export default function AdminStores() {
  useRequirePlatformAdmin();
  const { colors } = useTheme();
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (listStores) {
      listStores().then(setStores).catch(() => {});
    }
  }, []);

  const items: AdminListItem[] = stores.map((s) => ({
    id: s.id,
    title: s.name || s.id,
    onPress: () => router.push(`/admin/stores/${s.id}`),
  }));

  return (
    <AdminShell title="Stores">
      <AdminList items={items} emptyText="No stores found." />
    </AdminShell>
  );
}

// Styles removed: superseded by AdminShell/AdminList reusable components
