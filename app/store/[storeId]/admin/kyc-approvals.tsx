import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';

const KycApprovalsScreen = React.lazy(() => import('./_KycApprovalsScreen'));

export default function KycApprovalsRoute(props: any) {
  return (
    <Suspense fallback={<Spinner label="KYC Approvals" />}>
      <KycApprovalsScreen {...props} />
    </Suspense>
  );
}
