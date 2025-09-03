import { User } from '@/types';
import { assertNearChain } from '@services/chain';
import { getUser, setUser, listUsers, removeUser } from '@features/auth/services/nearUsers';
import { getPublicKeyHex } from '@services/localIdentity';
import SettingsAgent from './settings-agent';
import ensureNearWallet from '@/utils/ensureNearWallet';
import validateNearAddress from '@/utils/validateNearAddress';
import { verifyMessageSignature } from '@/utils/verifyMessageSignature';
import type { WakuMessage } from '@/types/waku';
import { normalizeMessage } from '../lib/normalizeMessage';
import AgentError from '@/types/AgentError';

assertNearChain();

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
    return ensureNearWallet('Please connect your NEAR wallet to manage users.');
  }

  async add(user: User): Promise<void> {
    const normalized = normalizeMessage<User>('User', user);
    const { address, publicKey } = await this.ensureWallet();
    const admins = await SettingsAgent.getInstance().getAdmins();
    if (address !== normalized.address && !admins.includes(address)) {
      throw new AgentError('UNAUTHORIZED', 'Only the user or an admin can add this user', 'users-agent');
    }
    const chatPublicKey = await getPublicKeyHex();
    const enriched: User = {
      ...normalized,
      publicKey,
      address,
      chatPublicKey,
    };
    if (!validateNearAddress(address)) {
      throw new AgentError('INVALID_NEAR_ADDRESS', 'Invalid NEAR address', 'users-agent');
    }
    await setUser(enriched);
  }

  async update(user: User): Promise<void> {
    const normalized = normalizeMessage<User>('User', user);
    const { address, publicKey } = await this.ensureWallet();
    const admins = await SettingsAgent.getInstance().getAdmins();
    if (address !== normalized.address && !admins.includes(address)) {
      throw new AgentError('UNAUTHORIZED', 'Only the user or an admin can update this user', 'users-agent');
    }
    const chatPublicKey = await getPublicKeyHex();
    const enriched: User = {
      ...normalized,
      publicKey,
      address,
      chatPublicKey,
    };
    if (!validateNearAddress(address)) {
      throw new AgentError('INVALID_NEAR_ADDRESS', 'Invalid NEAR address', 'users-agent');
    }
    await setUser(enriched);
  }

  async remove(id: string): Promise<void> {
    const { address } = await this.ensureWallet();
    const user = await getUser(id);
    if (!user) throw new AgentError('USER_NOT_FOUND', 'User not found', 'users-agent');
    const admins = await SettingsAgent.getInstance().getAdmins();
    if (address !== user.address && !admins.includes(address)) {
      throw new AgentError('UNAUTHORIZED', 'Only the user or an admin can remove this user', 'users-agent');
    }
    await removeUser(id);
  }

  // kyc.request
  async requestKyc(userId: string, documentUri: string): Promise<void> {
    const { address, publicKey } = await this.ensureWallet();
    const user = await getUser(userId);
    if (!user) throw new AgentError('USER_NOT_FOUND', 'User not found', 'users-agent');
    const admins = await SettingsAgent.getInstance().getAdmins();
    if (address !== user.address && !admins.includes(address)) {
      throw new AgentError('UNAUTHORIZED', 'Only the user or an admin can request KYC', 'users-agent');
    }
    const enriched: User = normalizeMessage<User>('User', {
      ...user,
      publicKey,
      address,
      kycStatus: 'pending',
      kycRequestedAt: new Date().toISOString(),
      kycDocumentUri: documentUri,
    });
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
      throw new AgentError('UNAUTHORIZED', 'Only admins can update KYC', 'users-agent');
    }
    const user = await getUser(userId);
    if (!user) throw new AgentError('USER_NOT_FOUND', 'User not found', 'users-agent');
    const enriched: User = normalizeMessage<User>('User', {
      ...user,
      publicKey,
      address,
      kycStatus: status,
      kycApprovedBy: adminId ?? address,
      kycApprovedAt: new Date().toISOString(),
    });
    await setUser(enriched);
  }

  async get(id: string): Promise<User | null> {
    return await getUser(id);
  }

  async getAll(): Promise<User[]> {
    return await listUsers();
  }

  async handleMessage(signed: WakuMessage<UsersAgentMessage>): Promise<void> {
    if (!(await verifyMessageSignature(signed, signed.sender.publicKey))) return;
    const msg = signed.payload;
    switch (msg.type) {
      case 'user.add':
        await this.add(normalizeMessage<User>('User', msg.payload));
        break;
      case 'user.update':
        await this.update(normalizeMessage<User>('User', msg.payload));
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
