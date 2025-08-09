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

  async add(user: User): Promise<void> {
    const enriched: User = {
      ...user,
      publicKey: tonAuth.getTonPublicKey() || user.publicKey,
      address: tonAuth.getAddress(),
    };
    await super.add(enriched);
  }

  async update(user: User): Promise<void> {
    const enriched: User = {
      ...user,
      publicKey: tonAuth.getTonPublicKey() || user.publicKey,
      address: tonAuth.getAddress(),
    };
    await super.update(enriched);
  }
}

export default new UsersAgent();
