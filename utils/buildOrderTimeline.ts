import { OrderStatus, OrderTrackingStep } from '@/types';

export function buildOrderTimeline(status: OrderStatus): OrderTrackingStep[] {
  // TODO:CORE-002 Angle 1 - Replace stub timeline builder once cross-network fulfillment milestones are finalized.
  const base: OrderTrackingStep[] = [
    {
      status: 'order_received',
      title: 'הזמנה התקבלה',
      timestamp: new Date().toISOString(),
      completed: false,
    },
    {
      status: 'courier_found',
      title: 'נמצא שליח מתאים',
      timestamp: '',
      completed: false,
    },
    {
      status: 'courier_picked_up',
      title: 'שליח אסף את ההזמנה',
      timestamp: '',
      completed: false,
    },
    {
      status: 'courier_on_way',
      title: 'שליח בדרך אלייך',
      timestamp: '',
      completed: false,
    },
    {
      status: 'delivered',
      title: 'הזמנה התקבלה (השאר ביקורת)',
      timestamp: '',
      completed: false,
    },
  ];

  const statusOrder: OrderStatus[] = [
    'order_received',
    'courier_found',
    'courier_picked_up',
    'courier_on_way',
    'delivered',
  ];

  const currentIndex = statusOrder.indexOf(status);
  for (let i = 0; i <= currentIndex && i < base.length; i++) {
    base[i].completed = true;
    if (!base[i].timestamp) {
      const now = new Date();
      const minutesAgo = (currentIndex - i) * 10;
      const ts = new Date(now.getTime() - minutesAgo * 60 * 1000);
      base[i].timestamp = ts.toISOString();
    }
  }

  return base;
}
