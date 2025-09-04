import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '../../../../components/RequireWallet';

const BulkUploadScreen = React.lazy(() => import('./_BulkUploadScreen'));

export default function BulkUploadRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <BulkUploadScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
