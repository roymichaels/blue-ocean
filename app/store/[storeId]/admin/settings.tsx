import React, { Suspense } from 'react';
import Spinner from '@shared/ui/Spinner';
import RequireWallet from '@/components/RequireWallet';

const SettingsScreen = React.lazy(() => import('./_SettingsScreen'));

export default function SettingsRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="Settings" />}>
        <SettingsScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
