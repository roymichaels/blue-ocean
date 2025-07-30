import { User } from '../types';
import { sendWakuUserUpdate } from '../lib/waku/sendWakuUserUpdate';
import WakuAgent from '../utils/wakuAgent';

class UsersAgent extends WakuAgent<User> {
  constructor() {
    super(sendWakuUserUpdate);
  }
}

export default new UsersAgent();
