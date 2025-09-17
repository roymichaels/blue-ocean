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
    setValue('settings', 'adminPublicKeys', JSON.stringify(['tenant-admin-key']));
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

    await usersAgent.requestKyc('u2', {
      document: { uri: 'ipfs://doc', hash: 'deadbeef' },
      artifacts: [
        {
          type: 'id-front',
          uri: 'ipfs://doc',
          hash: 'deadbeef',
          ts: 1700000000000,
          nonce: 'nonce123',
        },
      ],
      ts: 1700000000100,
      nonce: 'bundle-nonce',
      sig: 'cafebabe',
    });
    const pending = await usersAgent.get('u2');
    expect(pending?.kycStatus).toBe('pending');
    expect(pending?.kycDocument).toEqual({ uri: 'ipfs://doc', hash: 'deadbeef' });
    expect(pending?.kycArtifacts?.length).toBe(1);
    expect(pending?.kycBundleNonce).toBe('bundle-nonce');
    expect(pending?.kycBundleSig).toBe('cafebabe');

    await usersAgent.updateKyc('u2', 'verified', 'admin1', {
      kycReceiptHash: 'beadfeed',
      kycReceiptSig: 'siggy',
    });
    const verified = await usersAgent.get('u2');
    expect(verified?.kycStatus).toBe('verified');
    expect(verified?.kycApprovedBy).toBe('admin1');
    expect(verified?.kycReceiptHash).toBe('beadfeed');
    expect(verified?.kycReceiptSig).toBe('siggy');
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

  it('logs WhatsApp call receipts', async () => {
    const user: any = {
      id: 'u5',
      username: 'ellen',
      displayName: 'Ellen',
      role: 'user',
      address: '',
      publicKey: '',
    };
    await usersAgent.add(user);
    await usersAgent.logKycCallReceipt('u5', {
      receiptId: 'r1',
      issuedAt: '2024-01-01T00:00:00Z',
      issuerPublicKey: 'admin-key',
      ts: 1700000000000,
      nonce: 'nonce',
      whatsappNumber: '+972500000000',
    });
    const updated = await usersAgent.get('u5');
    expect(updated?.kycCallReceipts?.length).toBe(1);
  });
});
