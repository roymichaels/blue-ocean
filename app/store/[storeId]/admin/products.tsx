import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const ProductsScreen = React.lazy(() => import('./_ProductsScreen'));

export default function ProductsRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="Products" />}>
      <ProductsScreen {...props} />
    </Suspense>
  );
}
