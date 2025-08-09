import { Store } from '../types';
import { sendWakuStoreUpdate } from '../lib/waku/sendWakuStoreUpdate';
import WakuAgent from '../utils/wakuAgent';

class StoresAgent extends WakuAgent<Store> {
  constructor() {
    super(sendWakuStoreUpdate, {
      topic: '/congress/stores/1/proto',
      replayHistory: true,
      extractItem: (msg: any) => msg.store as Store,
    });
  }
}

export default new StoresAgent();
