import React, { Suspense } from 'react';
import { Spinner } from '@/ui/primitives';
import RequireWallet from '../../../../components/RequireWallet';

// Lazy-load the heavy KYC approvals screen to keep the initial bundle slim
const KycApprovalsScreen = React.lazy(() =>
  import(
    /* webpackChunkName: "admin-kyc-approvals" */ './_KycApprovalsScreen'
  )
);

export default function KycApprovalsRoute(props: any) {
  return (
    <RequireWallet>
      <Suspense fallback={<Spinner />}>
        <KycApprovalsScreen {...props} />
      </Suspense>
    </RequireWallet>
  );
}
