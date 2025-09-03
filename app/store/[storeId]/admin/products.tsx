import React, { Suspense } from 'react';
import Spinner from '@shared/ui/Spinner';
import RequireWallet from '@/components/RequireWallet';

const ProductsScreen = React.lazy(() => import('./_ProductsScreen'));

export default function ProductsRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="Products" />}>
        <ProductsScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
