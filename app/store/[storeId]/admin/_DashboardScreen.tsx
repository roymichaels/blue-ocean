import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import EmpireDashboard from '@/features/manager/components/EmpireDashboard';

export default function StoreDashboardScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ storeId?: string | string[] }>();
  const storeIdParam = params.storeId;
  const storeId = Array.isArray(storeIdParam) ? storeIdParam[0] : storeIdParam;

  return <EmpireDashboard storeId={storeId} />;
}
