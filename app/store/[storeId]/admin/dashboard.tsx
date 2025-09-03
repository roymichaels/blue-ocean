import React, { Suspense } from 'react';
import Spinner from '@shared/ui/Spinner';
import RequireWallet from '@/components/RequireWallet';

const DashboardScreen = React.lazy(() => import('./_DashboardScreen'));

export default function DashboardRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="Dashboard" />}>
        <DashboardScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
