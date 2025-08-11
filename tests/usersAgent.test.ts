import usersAgent from '../agents/users-agent';

jest.mock('../services/tonAuth', () => ({
  getAddress: () => 'addr_admin',
  getTonPublicKey: () => 'pub_admin',
  openModal: jest.fn(),
}));

jest.mock('../services/tonKvStore', () => require('./tonKvMock'));
import { __clear } from './tonKvMock';

describe('UsersAgent TON integration', () => {
  beforeEach(() => {
    __clear();
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
});
