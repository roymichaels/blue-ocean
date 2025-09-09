# Wallet Integration

Blue Ocean centralizes wallet interactions through the `WalletProvider` context (`contexts/WalletProvider.tsx`).

## Usage

```tsx
import { useWallet } from '@/contexts/WalletProvider';

function Example() {
  const { address, connect, sign, fetchRole } = useWallet();

  // Connect the user's wallet
  const handleConnect = () => connect();

  // Sign arbitrary messages
  const signSomething = async () => {
    const signature = await sign('hello world');
    console.log(signature);
  };

  // Retrieve the current user's role
  const loadRole = async () => {
    const role = await fetchRole();
    console.log(role);
  };
}
```

- `address` – currently connected account or `null`.
- `connect()` – prompts the wallet to connect.
- `sign(message)` – signs a message with the user's key and returns the signature.
- `fetchRole(accountId?)` – resolves the role for the given account (defaults to the connected account).

All components and pages should use `useWallet` instead of calling NEAR APIs directly.
