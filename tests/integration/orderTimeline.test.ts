import { buildTimelineEntries } from '@/features/orders/orderTimeline';
import type { Order } from '@/types';

describe('order timeline builder', () => {
  const baseOrder: Order = {
    id: 'order-1',
    userId: 'user-1',
    items: [] as any,
    total: 25,
    status: 'order_received',
    shippingAddress: {
      name: 'Test',
      phone: '123',
      street: 'Main',
      city: 'City',
      postalCode: '0000',
    },
    paymentMethod: 'cash_on_delivery',
    buyerAddress: 'buyer.test',
    sellerAddress: 'seller.test',
    itemsHash: 'hash',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    trackingSteps: [],
  } as Order;

  it('returns ordered timeline with current step highlighted', () => {
    const order: Order = {
      ...baseOrder,
      status: 'courier_on_way',
      trackingSteps: [
        { status: 'order_received', title: 'Order received', timestamp: '2024-01-01T00:00:00.000Z', completed: true },
        { status: 'courier_found', title: 'Courier found', timestamp: '2024-01-01T00:05:00.000Z', completed: true },
        { status: 'courier_picked_up', title: 'Picked up', timestamp: '2024-01-01T00:10:00.000Z', completed: true },
        { status: 'courier_on_way', title: 'On way', timestamp: '2024-01-01T00:15:00.000Z', completed: true },
      ],
    };
    const entries = buildTimelineEntries(order);
    expect(entries.map((entry) => entry.status)).toEqual([
      'order_received',
      'courier_found',
      'courier_picked_up',
      'courier_on_way',
      'delivered',
    ]);
    const current = entries.find((entry) => entry.isCurrent);
    expect(current?.status).toBe('courier_on_way');
    const pending = entries.find((entry) => entry.status === 'delivered');
    expect(pending?.completed).toBe(false);
  });

  it('includes refund status when order is refunded', () => {
    const order: Order = {
      ...baseOrder,
      status: 'refunded',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };
    const entries = buildTimelineEntries(order);
    expect(entries[entries.length - 1].status).toBe('refunded');
    expect(entries[entries.length - 1].completed).toBe(true);
  });
});
