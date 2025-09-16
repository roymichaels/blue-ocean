import { promptCancelOrder } from '@/features/orders/adminActions';
import type { Order } from '@/types';

describe('admin order actions', () => {
  it('shows confirmation prompt before cancelling', async () => {
    const order = { id: 'order-1' } as Order;
    const alertFn = jest.fn();
    const onConfirm = jest.fn();

    promptCancelOrder({ order, t: (_k, fallback) => fallback, onConfirm, alertFn });

    expect(alertFn).toHaveBeenCalledTimes(1);
    const [, , buttons] = alertFn.mock.calls[0];
    expect(Array.isArray(buttons)).toBe(true);
    const confirm = buttons.find((btn: any) => btn.style === 'destructive');
    expect(confirm).toBeDefined();
    await confirm?.onPress?.();
    expect(onConfirm).toHaveBeenCalled();
  });
});
