import { StoreChainClient } from '@/features/stores/services/storeChainClient';

describe('StoreChainClient', () => {
  const prevWorkerId = process.env.JEST_WORKER_ID;
  const prevNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.JEST_WORKER_ID = prevWorkerId;
    if (prevNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = prevNodeEnv;
    }
    jest.clearAllMocks();
  });

  function createClient(overrides: Partial<ConstructorParameters<typeof StoreChainClient>[0]> = {}) {
    const wallet = {
      signAndSendTransactions: jest.fn().mockResolvedValue([
        {
          transaction: { hash: 'tx-hash' },
          status: {
            SuccessValue: Buffer.from(
              JSON.stringify({ store_id: 'store-1', nft_id: 'nft-1' }),
            ).toString('base64'),
          },
        },
      ]),
    };
    const deps = {
      assertNearChain: jest.fn(),
      getSelector: jest.fn(() => ({ wallet: jest.fn().mockResolvedValue(wallet) })),
      nearConfig: jest.fn(() => ({ contractId: 'contract.near' })),
      chainAdapter: {
        signMessage: jest.fn().mockResolvedValue('signed'),
        getPublicKey: jest.fn(() => 'ed25519:pub'),
      } as any,
      loadAppConfig: jest.fn().mockResolvedValue({ EXPO_PUBLIC_RELAYER_URL: 'https://relayer.test' }),
      fetchFn: jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ tx: 'relayed-tx' }),
      }),
    } satisfies ConstructorParameters<typeof StoreChainClient>[0];
    return { client: new StoreChainClient({ ...deps, ...overrides }), deps, wallet };
  }

  it('mints stores via the connected wallet', async () => {
    const { client, deps, wallet } = createClient();

    const result = await client.mintStore('My Store');

    expect(deps.assertNearChain).toHaveBeenCalled();
    expect(deps.getSelector).toHaveBeenCalled();
    const selector = deps.getSelector.mock.results[0]?.value as any;
    await selector.wallet();
    expect(wallet.signAndSendTransactions).toHaveBeenCalled();
    expect(result).toEqual({ id: 'store-1', nftId: 'nft-1', txHash: 'tx-hash' });
  });

  it('signs payloads for cache mutations', async () => {
    process.env.JEST_WORKER_ID = '';
    delete process.env.NODE_ENV;
    const { client, deps } = createClient();

    await client.submitMutation('add', { store: { id: 'store-9' } });

    expect(deps.assertNearChain).toHaveBeenCalled();
    expect(deps.chainAdapter.signMessage).toHaveBeenCalled();
    const payload = deps.chainAdapter.signMessage.mock.calls[0][0];
    expect(typeof payload).toBe('string');
    expect(JSON.parse(payload)).toEqual({ action: 'add', store: { id: 'store-9' } });
  });

  it('submits meta-transactions to the relayer', async () => {
    const signMessage = jest.fn().mockResolvedValue('signature');
    const { client, deps } = createClient({
      chainAdapter: {
        signMessage,
        getPublicKey: jest.fn(() => 'ed25519:pub'),
      } as any,
    });

    const txHash = await client.createStoreOnChain({ id: 'store-1', name: 'Alpha', owner: 'owner.near' });

    expect(deps.assertNearChain).toHaveBeenCalled();
    expect(signMessage).toHaveBeenCalled();
    expect(deps.fetchFn).toHaveBeenCalledWith(
      'https://relayer.test/meta-tx',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = (deps.fetchFn.mock.calls[0][1] as RequestInit).body as string;
    expect(JSON.parse(body)).toMatchObject({
      action: 'create_store',
      args: { store_id: 'store-1', name: 'Alpha' },
      ownerId: 'owner.near',
    });
    expect(txHash).toBe('relayed-tx');
  });
});
