import React, { Suspense } from 'react';
import Spinner from '../../components/ui/Spinner';

const ProductScreen = React.lazy(() => import('./_ProductScreen'));

export default function ProductScreenRoute(props: any) {
  return (
    <Suspense fallback={<Spinner />}>
      <ProductScreen {...props} />
    </Suspense>
  );
}
