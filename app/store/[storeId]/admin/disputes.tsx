import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const DisputesScreen = React.lazy(() => import('./_DisputesScreen'));

export default function DisputesRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="Disputes" />}>
      <DisputesScreen {...props} />
    </Suspense>
  );
}
