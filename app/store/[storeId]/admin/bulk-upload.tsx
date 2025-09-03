import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import RequireWallet from '../../../../components/RequireWallet';

const BulkUploadScreen = React.lazy(() => import('./_BulkUploadScreen'));

export default function BulkUploadRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <BulkUploadScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
