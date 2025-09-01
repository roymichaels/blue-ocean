import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';
import RequireWallet from '../../../../components/RequireWallet';

const UserManagementScreen = React.lazy(() => import('./_UserManagementScreen'));

export default function UserManagementRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="User Management" />}>
        <UserManagementScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
