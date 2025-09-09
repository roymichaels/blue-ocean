import React from 'react';
import { useWallet } from '@/contexts/WalletProvider';

export default function WalletButton() {
  const { address: acct, connect } = useWallet();
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
          await connect();
        } catch {}
      }}
    >
      {acct ? `@ ${acct}` : 'Connect NEAR Wallet'}
    </button>
  );
}

