import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import RequireWallet from '../../../../components/RequireWallet';

const ProductsScreen = React.lazy(() => import('./_ProductsScreen'));

export default function ProductsRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ProductsScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
