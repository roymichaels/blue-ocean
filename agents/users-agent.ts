import { User } from '../types';
import { sendWakuUserUpdate } from '../lib/waku/sendWakuUserUpdate';
import WakuAgent from '../utils/wakuAgent';

class UsersAgent extends WakuAgent<User> {
  constructor() {
    super(sendWakuUserUpdate, {
      topic: '/congress/users/1/proto',
      replayHistory: true,
      extractItem: (msg: any) => msg.user as User,
      allowedRoles: ['admin', 'user', 'driver'],
    });
  }
}

export default new UsersAgent();
