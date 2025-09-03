import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import RequireWallet from '../../../../components/RequireWallet';

const DisputesScreen = React.lazy(() => import('./_DisputesScreen'));

export default function DisputesRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <DisputesScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
