import NotificationService from '@/services/notification';
import { setTranslations } from '@/i18n';

jest.mock('@/agents/notifications-agent', () => ({
  getAll: jest.fn().mockResolvedValue([
    {
      id: '1',
      userId: 'u1',
      title: 'notify.orderCreated',
      message: 'notify.orderCreated',
      type: 'order',
      read: false,
      timestamp: 1,
    },
  ]),
  add: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
}));

describe('NotificationService localization', () => {
  it('renders notifications in the user locale', async () => {
    setTranslations({ notify: { orderCreated: 'Order Created!' } });
    const svc = NotificationService.getInstance();
    const list = await svc.getNotifications('u1');
    expect(list[0].title).toBe('Order Created!');
  });
});
