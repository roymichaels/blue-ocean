import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const UserManagementScreen = React.lazy(() => import('./_UserManagementScreen'));

export default function UserManagementRoute(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <UserManagementScreen {...props} />
    </Suspense>
  );
}
