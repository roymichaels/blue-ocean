import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import RequireWallet from '../../../../components/RequireWallet';

const SettingsScreen = React.lazy(() => import('./_SettingsScreen'));

export default function SettingsRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <SettingsScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
