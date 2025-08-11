import { User } from '../types';
import tonAuth from '../services/tonAuth';
import { getUser, setUser, listUsers, removeUser } from '../services/tonUsers';

class UsersAgent {
  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage users.');
    }
    return { address, publicKey };
  }

  async add(user: User): Promise<void> {
    const { address, publicKey } = await this.ensureWallet();
    const enriched: User = { ...user, publicKey, address };
    await setUser(enriched);
  }

  async update(user: User): Promise<void> {
    const { address, publicKey } = await this.ensureWallet();
    const enriched: User = { ...user, publicKey, address };
    await setUser(enriched);
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    await removeUser(id);
  }

  // kyc.request
  async requestKyc(userId: string, documentUri: string): Promise<void> {
    const { address, publicKey } = await this.ensureWallet();
    const user = await getUser(userId);
    if (!user) throw new Error('User not found');
    const enriched: User = {
      ...user,
      publicKey,
      address,
      kycStatus: 'pending',
      kycRequestedAt: new Date().toISOString(),
      kycDocumentUri: documentUri,
    };
    await setUser(enriched);
  }

  // kyc.update
  async updateKyc(
    userId: string,
    status: 'verified' | 'rejected',
    adminId?: string,
  ): Promise<void> {
    const { address, publicKey } = await this.ensureWallet();
    const user = await getUser(userId);
    if (!user) throw new Error('User not found');
    const enriched: User = {
      ...user,
      publicKey,
      address,
      kycStatus: status,
      kycApprovedBy: adminId ?? address,
      kycApprovedAt: new Date().toISOString(),
    };
    await setUser(enriched);
  }

  async get(id: string): Promise<User | null> {
    return await getUser(id);
  }

  async getAll(): Promise<User[]> {
    return await listUsers();
  }
}

export default new UsersAgent();
