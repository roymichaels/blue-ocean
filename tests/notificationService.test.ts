import NotificationService from '../services/notification';
import notificationsAgent from '../agents/notifications-agent';

jest.mock('../lib/waku/sendWakuNotificationUpdate', () => ({
  sendWakuNotificationUpdate: jest.fn(),
}));

describe('NotificationService with Waku agent', () => {
  beforeEach(() => {
    (NotificationService as any).instance = undefined;
    (notificationsAgent as any).store.clear();
  });

  it('adds notifications to agent store', async () => {
    const svc = NotificationService.getInstance();
    const n = await svc.addNotification({
      userId: 'u1',
      title: 'Hello',
      message: 'World',
      type: 'system',
    });
    expect(n).toBeTruthy();
    expect(notificationsAgent.get(n!.id)).toEqual(n);
  });

  it('updates read status via agent', async () => {
    const svc = NotificationService.getInstance();
    const n = await svc.addNotification({
      userId: 'u1',
      title: 'Test',
      message: 'Msg',
      type: 'system',
    });
    await svc.markAsRead(n!.id);
    expect(notificationsAgent.get(n!.id)?.read).toBe(true);
  });
});
