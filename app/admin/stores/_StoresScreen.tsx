import React, { useEffect, useState } from 'react';
import { useAppRouter } from '@/services';
import { useRequirePlatformAdmin } from '@/services';
import chain from '@/services/chain';
import { Store } from '@/types';
import AdminList, { AdminListItem } from '@/components/admin/AdminList';

let listStores: (() => Promise<Store[]>) | undefined;
if (chain === 'near') {
  ({ listStores } = require('@/features/stores/services/nearStores'));
}

export default function AdminStores() {
  useRequirePlatformAdmin();
  const { push } = useAppRouter();
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (listStores) {
      listStores().then(setStores).catch(() => {});
    }
  }, []);

  const items: AdminListItem[] = stores.map((s) => ({
    id: s.id,
    title: s.name || s.id,
    onPress: () => push(`/admin/stores/${s.id}`),
  }));

  return <AdminList items={items} emptyText="No stores found." />;
}

// Styles removed: superseded by AdminList reusable components
