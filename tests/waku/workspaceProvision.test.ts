const mockPublish = jest.fn();
const mockSubscribeWithAck = jest.fn();

jest.mock('@/services/waku', () => ({
  publish: mockPublish,
  subscribeWithAck: mockSubscribeWithAck,
}));

const mockSignMessage = jest.fn<Promise<string>, [string | Uint8Array]>((message) =>
  Promise.resolve(typeof message === 'string' ? `sig:${message}` : 'sig:bytes'),
);
const mockGetPublicKey = jest.fn(() => 'wallet:test');
const mockSignIn = jest.fn().mockResolvedValue(undefined);
const mockGetAccountId = jest.fn(() => 'wallet.test');

jest.mock('@/features/auth/services/nearAuth', () => ({
  signMessage: mockSignMessage,
  getPublicKey: mockGetPublicKey,
  signIn: mockSignIn,
  getAccountId: mockGetAccountId,
}));

describe('workspace provisioning handshake', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(0);
    mockPublish.mockReset();
    mockSubscribeWithAck.mockReset();
    mockSignMessage.mockClear();
    mockSignMessage.mockImplementation((message: string | Uint8Array) =>
      Promise.resolve(typeof message === 'string' ? `sig:${message}` : 'sig:bytes'),
    );
    mockGetPublicKey.mockReset();
    mockGetPublicKey.mockReturnValue('wallet:test');
    mockSignIn.mockClear();
    mockSignIn.mockResolvedValue(undefined);
    mockGetAccountId.mockReset();
    mockGetAccountId.mockReturnValue('wallet.test');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves when ack arrives within 2 seconds', async () => {
    const ackHandlers: Record<string, (msg: any) => void> = {};
    mockSubscribeWithAck.mockImplementation(async (topic: string, handler: (msg: any) => void) => {
      ackHandlers[topic] = handler;
      return () => {};
    });
    mockPublish.mockImplementation(async (_topic: string, msg: any) => {
      setTimeout(() => {
        ackHandlers['/blue-ocean/workspaces/1/ack']?.({ id: msg.id });
      }, 1500);
      return msg.id || 'mock-id';
    });

    const { provisionWorkspace } = await import('@/core/workspace');

    const promise = provisionWorkspace();
    await jest.advanceTimersByTimeAsync(1500);
    const session = await promise;

    expect(session.workspaceId).toMatch(/^ws_[a-f0-9]{16}$/i);
    expect(mockPublish).toHaveBeenCalledWith(
      '/blue-ocean/workspaces/1',
      expect.objectContaining({
        type: 'workspace.created',
        payload: expect.objectContaining({
          workspaceId: session.workspaceId,
          session: session.token,
        }),
      }),
    );
  });

  it('rejects when ack does not arrive within 2 seconds', async () => {
    mockSubscribeWithAck.mockImplementation(async () => () => {});
    mockPublish.mockImplementation(async (_topic: string, msg: any) => msg.id || 'mock-id');

    const { provisionWorkspace, WORKSPACE_HANDSHAKE_TIMEOUT_MS } = await import('@/core/workspace');

    const promise = provisionWorkspace();
    await jest.advanceTimersByTimeAsync(WORKSPACE_HANDSHAKE_TIMEOUT_MS);
    await expect(promise).rejects.toThrow('{E_WORKSPACE_ACK_TIMEOUT}');
  });
});
