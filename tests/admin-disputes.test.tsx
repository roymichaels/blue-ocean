import OrderService from '../services/orders';
import ordersAgent from '../agents/orders-agent';
import { adminResolve } from '../services/tonContract';

jest.mock('../agents/orders-agent', () => ({
  get: jest.fn(),
  update: jest.fn(),
  subscribe: jest.fn(),
}));

jest.mock('../services/tonContract', () => ({
  adminResolve: jest.fn().mockResolvedValue('tx'),
}));

jest.mock('../services/eventLog', () => ({ logOrderEvent: jest.fn() }));
jest.mock('@/features/auth/services/nearAuth', () => ({
  getAccountId: jest.fn().mockReturnValue('EQtestadmin'),
  signIn: jest.fn(),
}));

describe('OrderService.resolveDispute', () => {
  const svc = OrderService.getInstance();

  beforeEach(() => {
    (ordersAgent.get as jest.Mock).mockReset();
    (ordersAgent.update as jest.Mock).mockReset();
    (adminResolve as jest.Mock).mockClear();
  });

  it('resolves dispute in favor of seller', async () => {
    const order: any = {
      id: 'o1',
      escrowAddr: 'esc1',
      status: 'disputed',
      trackingSteps: [],
      items: [],
      total: 0,
      paymentMethod: 'ton',
      itemsHash: '',
      createdAt: '',
      updatedAt: '',
    };
    (ordersAgent.get as jest.Mock).mockResolvedValue(order);
    await svc.resolveDispute('o1', true);
    expect(adminResolve).toHaveBeenCalledWith('esc1', true);
    expect(ordersAgent.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'released' }),
    );
  });

  it('resolves dispute in favor of buyer', async () => {
    const order: any = {
      id: 'o2',
      escrowAddr: 'esc2',
      status: 'disputed',
      trackingSteps: [],
      items: [],
      total: 0,
      paymentMethod: 'ton',
      itemsHash: '',
      createdAt: '',
      updatedAt: '',
    };
    (ordersAgent.get as jest.Mock).mockResolvedValue(order);
    await svc.resolveDispute('o2', false);
    expect(adminResolve).toHaveBeenCalledWith('esc2', false);
    expect(ordersAgent.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'refunded' }),
    );
  });
});
