import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';
import RequireWallet from '../../../../components/RequireWallet';

const PricingTiersScreen = React.lazy(() => import('./_PricingTiersScreen'));

export default function PricingTiersRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="Pricing Tiers" />}>
        <PricingTiersScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
