import { Buffer } from 'buffer';
import { createWorkspace, validateWorkspaceSession, refreshWorkspaceSession, getWorkspaceIdFromToken } from '@/core/workspace';
import { signMessage } from '@/features/auth/services/nearAuth';

jest.mock('@/features/auth/services/nearAuth', () => ({
  signMessage: jest.fn((msg: string) => Promise.resolve(`sig:${msg}`)),
}));

const mockSignMessage = signMessage as jest.MockedFunction<typeof signMessage>;

describe('workspace session service', () => {
  beforeEach(() => {
    mockSignMessage.mockClear();
    mockSignMessage.mockImplementation((message: string | Uint8Array<ArrayBufferLike>) =>
      Promise.resolve(
        `sig:${typeof message === 'string' ? message : Buffer.from(message).toString('hex')}`,
      ),
    );
  });

  it('creates a pseudonymous workspace and signs session payloads', async () => {
    const session = await createWorkspace();
    expect(session.workspaceId).toMatch(/^ws_[a-f0-9]{16}$/i);
    expect(mockSignMessage).toHaveBeenCalledTimes(1);

    const signedPayload = mockSignMessage.mock.calls[0][0];
    expect(typeof signedPayload).toBe('string');
    expect(signedPayload).toContain('"read"');
    expect(signedPayload).toContain('"write"');

    const validated = validateWorkspaceSession(session.token);
    expect(validated).toBe(session.workspaceId);
    expect(getWorkspaceIdFromToken(session.token)).toBe(session.workspaceId);
  });

  it('refreshes workspace sessions and rotates tokens', async () => {
    mockSignMessage
      .mockImplementationOnce((message: string | Uint8Array<ArrayBufferLike>) =>
        Promise.resolve(
          `sig-init:${typeof message === 'string' ? message : Buffer.from(message).toString('hex')}`,
        ),
      )
      .mockImplementationOnce((message: string | Uint8Array<ArrayBufferLike>) =>
        Promise.resolve(
          `sig-refresh:${typeof message === 'string' ? message : Buffer.from(message).toString('hex')}`,
        ),
      );

    const initial = await createWorkspace();
    const refreshed = await refreshWorkspaceSession(initial.token);

    expect(refreshed.token).not.toBe(initial.token);
    expect(refreshed.workspaceId).toBe(initial.workspaceId);
    expect(validateWorkspaceSession(refreshed.token)).toBe(initial.workspaceId);
    expect(() => validateWorkspaceSession(initial.token)).toThrow('{E_EXPIRED}');
  });

  it('throws for malformed workspace tokens', () => {
    expect(() => getWorkspaceIdFromToken('not-a-token')).toThrow('{E_WORKSPACE_TOKEN}');
  });
});
