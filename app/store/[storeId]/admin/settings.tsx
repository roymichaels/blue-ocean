import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import RequireWallet from '../../../../components/RequireWallet';

const SettingsScreen = React.lazy(() => import('./_SettingsScreen'));

export default function SettingsRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <ErrorBoundary>
          <SettingsScreen {...props} />
        </ErrorBoundary>
      </Suspense>
    </RequireWallet>
  );
}
