import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';
import RequireWallet from '../../../../components/RequireWallet';

const DisputesScreen = React.lazy(() => import('./_DisputesScreen'));

export default function DisputesRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="Disputes" />}>
        <DisputesScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
