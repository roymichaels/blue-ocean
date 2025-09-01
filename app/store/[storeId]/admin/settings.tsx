import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const SettingsScreen = React.lazy(() => import('./_SettingsScreen'));

export default function SettingsRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="Settings" />}>
      <SettingsScreen {...props} />
    </Suspense>
  );
}
