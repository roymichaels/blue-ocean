import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const DashboardScreen = React.lazy(() => import('./_DashboardScreen'));

export default function DashboardRoute(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <DashboardScreen {...props} />
    </Suspense>
  );
}
