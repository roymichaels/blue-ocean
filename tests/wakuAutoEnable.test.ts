import DatabaseService from '../services/database';
import OrderService from '../services/orders';
import ordersAgent from '../agents/orders-agent';
import { insertConfig } from './testUtils';
import config, { initConfig } from '../utils/appConfig';
import { sendWakuUserUpdate } from '../lib/waku/sendWakuUserUpdate';
import { sendWakuOrderUpdate } from '../lib/waku/sendWakuOrderUpdate';

jest.mock('../lib/waku/sendWakuUserUpdate');
jest.mock('../lib/waku/sendWakuOrderUpdate');

describe('Waku auto enable', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (DatabaseService as any).instance = undefined;
    (OrderService as any).instance = undefined;
    for (const key of Object.keys(config)) {
      delete (config as any)[key];
    }
    // ensure no secret is preset
    insertConfig({});
    await initConfig();
  });

  it('generates secret automatically and broadcasts user updates', async () => {
    expect(config.EXPO_PUBLIC_WAKU_SECRET).toBeDefined();
    const db = DatabaseService.getInstance();
    jest.spyOn(db, 'getUserProfile').mockResolvedValue({ id: '1' } as any);
    await db.updateUserRole('1', 'admin');
    expect(sendWakuUserUpdate).toHaveBeenCalled();
  });

  it('broadcasts order update without manual secret', async () => {
    const svc = OrderService.getInstance();
    jest.spyOn(ordersAgent as any, 'get').mockReturnValue({ id: '1', status: 'pending' });
    await svc.updateOrderStatus('1', 'delivered');
    expect(sendWakuOrderUpdate).toHaveBeenCalled();
  });
});
