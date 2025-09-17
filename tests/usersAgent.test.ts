import usersAgent from '../agents/users-agent';
import SettingsAgent from '../agents/settings-agent';

jest.mock('../utils/validateNearAddress', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(true),
}));
import validateNearAddress from '../utils/validateNearAddress';

jest.mock('@/features/auth/services/nearAuth', () => ({
  getAccountId: () => 'addr_admin',
  getPublicKey: () => 'pub:addr_admin',
  signIn: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/localIdentity', () => ({
  getPublicKeyHex: () => 'chat_pub',
}));

jest.mock('@/services/nearKvStore', () => require('./nearKvMock'));
import { __clear, setValue } from './nearKvMock';

describe('UsersAgent NEAR integration', () => {
  beforeEach(() => {
    __clear();
    (SettingsAgent as any).instance = undefined;
    setValue('settings', 'admins', JSON.stringify(['addr_admin']));
    setValue(
      'settings',
      'adminScopes',
      JSON.stringify({ addr_admin: ['admin:settings', 'admin:users', 'admin:orders'] }),
    );
  });

  it('adds and retrieves users via NEAR service', async () => {
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

    await usersAgent.requestKyc('u2', { uri: 'ipfs://doc', hash: 'deadbeef' });
    const pending = await usersAgent.get('u2');
    expect(pending?.kycStatus).toBe('pending');
    expect(pending?.kycDocument).toEqual({ uri: 'ipfs://doc', hash: 'deadbeef' });

    await usersAgent.updateKyc('u2', 'verified', 'admin1', {
      kycReceiptHash: 'beadfeed',
    });
    const verified = await usersAgent.get('u2');
    expect(verified?.kycStatus).toBe('verified');
    expect(verified?.kycApprovedBy).toBe('admin1');
    expect(verified?.kycReceiptHash).toBe('beadfeed');
    const storedHash = await usersAgent.getKycReceiptHash('u2');
    expect(storedHash).toBe('beadfeed');
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

  it('denies admin without users scope', async () => {
    const user: any = {
      id: 'u4',
      username: 'dave',
      displayName: 'Dave',
      role: 'user',
      address: '',
      publicKey: '',
    };
    await usersAgent.add(user);
    setValue('settings', 'adminScopes', JSON.stringify({ addr_admin: ['admin:settings'] }));
    await expect(usersAgent.updateKyc('u4', 'verified')).rejects.toThrow(
      'Only admins',
    );
  });
});
