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
    const user: any = { id: 'u1', name: 'Alice', role: 'user', address: '', publicKey: '' };
    await usersAgent.add(user);
    const fetched = await usersAgent.get('u1');
    expect(fetched?.name).toBe('Alice');
    const all = await usersAgent.getAll();
    expect(all.length).toBe(1);
  });
});
