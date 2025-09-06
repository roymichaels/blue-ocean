import React from 'react';
import { chainAdapter } from '@/services/chain';

export default function WalletButton() {
  const [acct, setAcct] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      setAcct(chainAdapter.getAccountId());
    } catch {}
  }, []);
  return (
    <button
      style={{
        borderRadius: 12,
        padding: '8px 16px',
        backgroundColor: '#2563eb',
        color: 'white',
        fontWeight: 600,
      }}
      onClick={async () => {
        try {
          await chainAdapter.openModal();
          setAcct(chainAdapter.getAccountId());
        } catch {}
      }}
    >
      {acct ? `@ ${acct}` : 'Connect NEAR Wallet'}
    </button>
  );
}

