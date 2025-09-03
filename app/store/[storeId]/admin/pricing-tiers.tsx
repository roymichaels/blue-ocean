import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import RequireWallet from '../../../../components/RequireWallet';

const PricingTiersScreen = React.lazy(() => import('./_PricingTiersScreen'));

export default function PricingTiersRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <PricingTiersScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
