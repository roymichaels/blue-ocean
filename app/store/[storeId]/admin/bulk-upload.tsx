import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const BulkUploadScreen = React.lazy(() => import('./_BulkUploadScreen'));

export default function BulkUploadRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="Bulk Upload" />}>
      <BulkUploadScreen {...props} />
    </Suspense>
  );
}
