import DatabaseService from '../services/database';
import OrderService from '../services/orders';
import { insertConfig } from './testUtils';
import { sendWakuUserUpdate } from '../lib/waku/sendWakuUserUpdate';
import { sendWakuOrderUpdate } from '../lib/waku/sendWakuOrderUpdate';

jest.mock('../lib/waku/sendWakuUserUpdate');
jest.mock('../lib/waku/sendWakuOrderUpdate');

describe('Waku disabled behaviour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DatabaseService as any).instance = undefined;
    (OrderService as any).instance = undefined;
  });

  it('skips user update when Waku disabled', async () => {
    await insertConfig({ EXPO_PUBLIC_USE_WAKU: 'false' });
    const db = DatabaseService.getInstance();
    jest.spyOn(db, 'getUserProfile').mockResolvedValue({ id: '1' } as any);
    await db.updateUserRole('1', 'admin');
    expect(sendWakuUserUpdate).not.toHaveBeenCalled();
  });

  it('skips order update when secret missing', async () => {
    await insertConfig({ EXPO_PUBLIC_USE_WAKU: 'true', EXPO_PUBLIC_WAKU_SECRET: '' });
    const svc = OrderService.getInstance();
    jest.spyOn(svc as any, 'getOrder').mockResolvedValue({ id: '1' } as any);
    await svc.updateOrderStatus('1', 'delivered');
    expect(sendWakuOrderUpdate).not.toHaveBeenCalled();
  });
});
