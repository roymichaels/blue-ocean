import React, { Suspense } from 'react';
import Spinner from '../../../../components/ui/Spinner';
import RequireWallet from '../../../../components/RequireWallet';

const KycApprovalsScreen = React.lazy(() => import('./_KycApprovalsScreen'));

export default function KycApprovalsRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner label="KYC Approvals" />}>
        <KycApprovalsScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
