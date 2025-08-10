import { User } from '../types';
import { sendWakuUserUpdate } from '../lib/waku/sendWakuUserUpdate';
import WakuAgent from '../utils/wakuAgent';
import tonAuth from '../services/tonAuth';

class UsersAgent extends WakuAgent<User> {
  constructor() {
    super(sendWakuUserUpdate, {
      topic: '/congress/users/1/proto',
      replayHistory: true,
      extractItem: (msg: any) => msg.user as User,
    });
  }

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
    const enriched: User = {
      ...user,
      publicKey,
      address,
    };
    await super.add(enriched);
  }

  async update(user: User): Promise<void> {
    const { address, publicKey } = await this.ensureWallet();
    const enriched: User = {
      ...user,
      publicKey,
      address,
    };
    await super.update(enriched);
  }
}

export default new UsersAgent();
