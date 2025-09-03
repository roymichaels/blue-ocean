import React, { Suspense } from 'react';
import Spinner from '@shared/ui/Spinner';
import RequireWallet from '@/components/RequireWallet';

const BulkUploadScreen = React.lazy(() => import('./_BulkUploadScreen'));

export default function BulkUploadRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="Bulk Upload" />}>
        <BulkUploadScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
