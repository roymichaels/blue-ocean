import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import RequireWallet from '../../../components/RequireWallet';

const StoresScreen = React.lazy(() => import('./_StoresScreen'));

export default function AdminStoresRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <StoresScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
