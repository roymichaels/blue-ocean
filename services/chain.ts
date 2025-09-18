const chain = 'near';

export const chainAdapter = {
  async init() { throw new Error('Unsupported chain'); },
  async openModal() { throw new Error('Unsupported chain'); },
  useAccount() { return null; },
  useAccountId() { return null; },
  getAccountId() { return null; },
  getPublicKey() { return null; },
  getSelector() { return null; },
  async getBalance() { return '0'; },
  async signMessage() { throw new Error('Unsupported chain'); },
  async listOrdersBySeller() { throw new Error('Unsupported chain'); },
  async listOrdersByBuyer() { throw new Error('Unsupported chain'); },
  async payPrivately() { throw new Error('Unsupported chain'); },
};

export function assertNearChain(): void {
  if (chain !== 'near') {
    throw new Error('BlueOcean is NEAR-only. Set EXPO_PUBLIC_CHAIN=near');
  }
}

export default chain;