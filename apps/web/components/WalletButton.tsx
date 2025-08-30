import React from 'react';
import nearAuth from '../../../services/nearAuth';

export default function WalletButton() {
  const [acct, setAcct] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      setAcct(nearAuth.getAccountId());
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
          await nearAuth.signIn();
          setAcct(nearAuth.getAccountId());
        } catch {}
      }}
    >
      {acct ? `@ ${acct}` : 'Connect NEAR Wallet'}
    </button>
  );
}

