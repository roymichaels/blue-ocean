import usersAgent from '../agents/users-agent';

jest.mock('../utils/validateNearAddress', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(true),
}));
import validateNearAddress from '../utils/validateNearAddress';

jest.mock('@/features/auth/services/nearAuth', () => ({
  getAccountId: () => 'addr_admin',
  signIn: jest.fn(),
}));

jest.mock('../services/localIdentity', () => ({
  getPublicKeyHex: () => 'chat_pub',
}));

jest.mock('../services/nearKvStore', () => require('./nearKvMock'));
import { __clear } from './nearKvMock';
import { setAdmins } from '../services/tonSettings';

describe('UsersAgent NEAR integration', () => {
  beforeEach(() => {
    __clear();
    void setAdmins(['addr_admin'], 'addr_admin');
  });

  it('adds and retrieves users via TON service', async () => {
    const user: any = {
      id: 'u1',
      username: 'alice',
      displayName: 'Alice',
      role: 'user',
      address: '',
      publicKey: '',
    };
    await usersAgent.add(user);
    const fetched = await usersAgent.get('u1');
    expect(fetched?.displayName).toBe('Alice');
    const all = await usersAgent.getAll();
    expect(all.length).toBe(1);
  });

  it('processes kyc request and update', async () => {
    const user: any = {
      id: 'u2',
      username: 'bob',
      displayName: 'Bob',
      role: 'user',
      address: '',
      publicKey: '',
    };
    await usersAgent.add(user);

    await usersAgent.requestKyc('u2', 'ipfs://doc');
    const pending = await usersAgent.get('u2');
    expect(pending?.kycStatus).toBe('pending');
    expect(pending?.kycDocumentUri).toBe('ipfs://doc');

    await usersAgent.updateKyc('u2', 'verified', 'admin1');
    const verified = await usersAgent.get('u2');
    expect(verified?.kycStatus).toBe('verified');
    expect(verified?.kycApprovedBy).toBe('admin1');
  });

  it('rejects invalid NEAR addresses', async () => {
    (validateNearAddress as jest.Mock).mockReturnValueOnce(false);
    const user: any = {
      id: 'u3',
      username: 'charlie',
      displayName: 'Charlie',
      role: 'user',
      address: '',
      publicKey: '',
    };
    await expect(usersAgent.add(user)).rejects.toThrow('Invalid NEAR address');
  });
});
