import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const PricingTiersScreen = React.lazy(() => import('./_PricingTiersScreen'));

export default function PricingTiersRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="Pricing Tiers" />}>
      <PricingTiersScreen {...props} />
    </Suspense>
  );
}
