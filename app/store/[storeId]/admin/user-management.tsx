import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '../../../../components/RequireWallet';

const UserManagementScreen = React.lazy(() => import('./_UserManagementScreen'));

export default function UserManagementRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <UserManagementScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
