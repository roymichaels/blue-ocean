import { Notification } from '../types';
import { sendWakuNotificationUpdate } from '../lib/waku/sendWakuNotificationUpdate';
import WakuAgent from '../utils/wakuAgent';

class NotificationsAgent extends WakuAgent<Notification> {
  private subscribers: Set<(n: Notification) => void> = new Set();

  constructor() {
    super(sendWakuNotificationUpdate, {
      topic: '/congress/notifications/1',
      replayHistory: true,
      extractItem: (msg: any) => msg.notification as Notification,
      onUpdate: (item: Notification) => {
        this.subscribers.forEach((cb) => cb(item));
      },
    });
  }

  subscribe(cb: (n: Notification) => void) {
    this.subscribers.add(cb);
  }

  unsubscribe(cb: (n: Notification) => void) {
    this.subscribers.delete(cb);
  }
}

export default new NotificationsAgent();
