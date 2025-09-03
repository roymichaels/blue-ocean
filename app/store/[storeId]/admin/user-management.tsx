import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import RequireWallet from '../../../../components/RequireWallet';

const UserManagementScreen = React.lazy(() => import('./_UserManagementScreen'));

export default function UserManagementRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <UserManagementScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
