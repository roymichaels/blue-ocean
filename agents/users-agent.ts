import { User, type KycArtifactBundle, type KycCallReceiptRecord } from '@/types';
import { assertNearChain } from '@/services/chain';
import { getUser, setUser, listUsers, removeUser } from '@/features/auth/services/nearUsers';
import { getPublicKeyHex } from '@/services/localIdentity';
import SettingsAgent from './settings-agent';
import ensureNearWallet from '@/utils/ensureNearWallet';
import validateNearAddress from '@/utils/validateNearAddress';
import { verifyMessageSignature } from '@/utils/verifyMessageSignature';
import type { WakuMessage } from '@/types/waku';
import { normalizeMessage } from '../lib/normalizeMessage';
import AgentError from '@/types/AgentError';

if (typeof assertNearChain === 'function') {
  try { assertNearChain(); } catch {}
}

export type UsersAgentMessage =
  | { type: 'user.add'; payload: User }
  | { type: 'user.update'; payload: User }
  | { type: 'user.remove'; payload: { id: string } }
  | {
      type: 'kyc.request';
      payload: { userId: string; bundle: KycArtifactBundle };
    }
  | {
      type: 'kyc.update';
      payload: { userId: string; status: 'verified' | 'rejected'; adminId?: string };
    }
  | {
      type: 'kyc.call';
      payload: { userId: string; receipt: KycCallReceiptRecord };
    };

// TODO:TODO-109 Add audit-trail friendly storage of KYC transitions to meet regional compliance requirements.
// TODO:REC-209 Evaluate using capability tokens instead of wallet prompts for privileged user mutations.
class UsersAgent {
  private async ensureWallet() {
    const { address, publicKey } = await ensureNearWallet(
      'Please connect your NEAR wallet to manage users.',
    );
    return { address, publicKey };
  }

  async add(user: User): Promise<void> {
    const normalized = normalizeMessage<User>('User', user);
    const { address, publicKey } = await this.ensureWallet();
    const hasScope = await SettingsAgent.getInstance().hasAdminScope(
      address,
      'admin:users',
    );
    if (address !== normalized.address && !hasScope) {
      throw new AgentError(
        'UNAUTHORIZED',
        'Only the user or an admin with scope admin:users can add this user',
        'users-agent',
      );
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
    const hasScope = await SettingsAgent.getInstance().hasAdminScope(
      address,
      'admin:users',
    );
    if (address !== normalized.address && !hasScope) {
      throw new AgentError(
        'UNAUTHORIZED',
        'Only the user or an admin with scope admin:users can update this user',
        'users-agent',
      );
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
    const hasScope = await SettingsAgent.getInstance().hasAdminScope(
      address,
      'admin:users',
    );
    if (address !== user.address && !hasScope) {
      throw new AgentError(
        'UNAUTHORIZED',
        'Only the user or an admin with scope admin:users can remove this user',
        'users-agent',
      );
    }
    await removeUser(id);
  }

  // kyc.request
  async requestKyc(userId: string, bundle: KycArtifactBundle): Promise<void> {
    const { address, publicKey } = await this.ensureWallet();
    const user = await getUser(userId);
    if (!user) throw new AgentError('USER_NOT_FOUND', 'User not found', 'users-agent');
    const hasScope = await SettingsAgent.getInstance().hasAdminScope(
      address,
      'admin:users',
    );
    if (address !== user.address && !hasScope) {
      throw new AgentError(
        'UNAUTHORIZED',
        'Only the user or an admin with scope admin:users can request KYC',
        'users-agent',
      );
    }
    const enriched: User = normalizeMessage<User>('User', {
      ...user,
      publicKey,
      address,
      kycStatus: 'pending',
      kycRequestedAt: new Date().toISOString(),
      kycRequestNotes: bundle.notes ?? user.kycRequestNotes,
      kycDocument: bundle.document,
      kycArtifacts: bundle.artifacts,
      kycBundleNonce: bundle.nonce,
      kycBundleSig: bundle.sig,
      kycWhatsappNumber: bundle.whatsappNumber ?? user.kycWhatsappNumber,
    });
    await setUser(enriched);
  }

  // kyc.update
  async updateKyc(
    userId: string,
    status: 'verified' | 'rejected',
    adminId?: string,
    options?: {
      kycReceiptHash?: string;
      approvedAt?: string;
      approvedBy?: string;
    },
  ): Promise<void> {
    const { address, publicKey } = await this.ensureWallet();
    const hasScope = await SettingsAgent.getInstance().hasAdminScope(
      address,
      'admin:users',
    );
    if (!hasScope) {
      throw new AgentError(
        'UNAUTHORIZED',
        'Only admins with scope admin:users can update KYC',
        'users-agent',
      );
    }
    const user = await getUser(userId);
    if (!user) throw new AgentError('USER_NOT_FOUND', 'User not found', 'users-agent');
    const now = options?.approvedAt ?? new Date().toISOString();
    const approvedBy = options?.approvedBy ?? adminId ?? address;
    const nextHash =
      status === 'verified'
        ? options?.kycReceiptHash ?? user.kycReceiptHash
        : status === 'rejected'
        ? undefined
        : user.kycReceiptHash;
    const callReceipts =
      status === 'verified' ? user.kycCallReceipts ?? [] : user.kycCallReceipts;
    const enriched: User = normalizeMessage<User>('User', {
      ...user,
      publicKey,
      address,
      kycStatus: status,
      kycReceiptHash: nextHash,
      kycApprovedBy: status === 'verified' ? approvedBy : user.kycApprovedBy,
      kycApprovedAt: status === 'verified' ? now : user.kycApprovedAt,
      kycCallReceipts: callReceipts,
    });
    await setUser(enriched);
  }

  async logKycCallReceipt(userId: string, receipt: KycCallReceiptRecord): Promise<void> {
    const { address, publicKey } = await this.ensureWallet();
    const hasScope = await SettingsAgent.getInstance().hasAdminScope(
      address,
      'admin:users',
    );
    if (!hasScope) {
      throw new AgentError(
        'UNAUTHORIZED',
        'Only admins with scope admin:users can log call receipts',
        'users-agent',
      );
    }
    const user = await getUser(userId);
    if (!user) throw new AgentError('USER_NOT_FOUND', 'User not found', 'users-agent');
    const nextReceipts = [...(user.kycCallReceipts ?? []), receipt];
    const enriched: User = normalizeMessage<User>('User', {
      ...user,
      publicKey,
      address,
      kycCallReceipts: nextReceipts,
    });
    await setUser(enriched);
  }

  async getKycReceiptHash(userId: string): Promise<string | null> {
    const user = await getUser(userId);
    if (!user) return null;
    const hash = user.kycReceiptHash;
    if (typeof hash !== 'string' || hash.length === 0) return null;
    return hash;
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
        await this.requestKyc(msg.payload.userId, msg.payload.bundle);
        break;
      case 'kyc.update':
        await this.updateKyc(
          msg.payload.userId,
          msg.payload.status,
          msg.payload.adminId,
        );
        break;
      case 'kyc.call':
        await this.logKycCallReceipt(msg.payload.userId, msg.payload.receipt);
        break;
    }
  }
}

export default new UsersAgent();
