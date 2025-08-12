import { User } from '../types';
import tonAuth from '../services/tonAuth';
import { getUser, setUser, listUsers, removeUser } from '../services/tonUsers';
import { getPublicKeyHex } from '../services/localIdentity';
import SettingsAgent from './settings-agent';

export type UsersAgentMessage =
  | { type: 'user.add'; payload: User }
  | { type: 'user.update'; payload: User }
  | { type: 'user.remove'; payload: { id: string } }
  | { type: 'kyc.request'; payload: { userId: string; documentUri: string } }
  | {
      type: 'kyc.update';
      payload: { userId: string; status: 'verified' | 'rejected'; adminId?: string };
    };

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
    const admins = await SettingsAgent.getInstance().getAdmins();
    if (address !== user.address && !admins.includes(address)) {
      throw new Error('Only the user or an admin can add this user');
    }
    const chatPublicKey = await getPublicKeyHex();
    const enriched: User = { ...user, publicKey, address, chatPublicKey };
    await setUser(enriched);
  }

  async update(user: User): Promise<void> {
    const { address, publicKey } = await this.ensureWallet();
    const admins = await SettingsAgent.getInstance().getAdmins();
    if (address !== user.address && !admins.includes(address)) {
      throw new Error('Only the user or an admin can update this user');
    }
    const chatPublicKey = await getPublicKeyHex();
    const enriched: User = { ...user, publicKey, address, chatPublicKey };
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
    const admins = await SettingsAgent.getInstance().getAdmins();
    if (address !== user.address && !admins.includes(address)) {
      throw new Error('Only the user or an admin can request KYC');
    }
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
    const admins = await SettingsAgent.getInstance().getAdmins();
    if (!admins.includes(address)) {
      throw new Error('Only admins can update KYC');
    }
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

  async handleMessage(msg: UsersAgentMessage): Promise<void> {
    switch (msg.type) {
      case 'user.add':
        await this.add(msg.payload);
        break;
      case 'user.update':
        await this.update(msg.payload);
        break;
      case 'user.remove':
        await this.remove(msg.payload.id);
        break;
      case 'kyc.request':
        await this.requestKyc(msg.payload.userId, msg.payload.documentUri);
        break;
      case 'kyc.update':
        await this.updateKyc(
          msg.payload.userId,
          msg.payload.status,
          msg.payload.adminId,
        );
        break;
    }
  }
}

export default new UsersAgent();
