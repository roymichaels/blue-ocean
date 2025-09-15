import {
  orderCreatedEventSchema,
  orderFailedEventSchema,
  notifyOrderCreatedSchema,
  notifyOrderFailedSchema,
  backlogErrorSchema,
} from '../schemas/notifications';

describe('notification schemas', () => {
  test('orderCreatedEventSchema validates payload', () => {
    const evt = {
      type: 'order.created',
      payload: { orderId: 'o1', userId: 'u1', total: 100 },
      sender: { publicKey: 'k' },
      signature: 's',
    };
    expect(orderCreatedEventSchema.parse(evt)).toEqual(evt);
  });

  test('orderFailedEventSchema validates payload', () => {
    const evt = {
      type: 'order.failed',
      payload: {
        orderId: 'o2',
        userId: 'u2',
        code: 'E_BACKLOG',
        reason: 'backlog',
      },
      sender: { publicKey: 'k' },
      signature: 's',
    };
    expect(orderFailedEventSchema.parse(evt)).toEqual(evt);
  });

  test('notifyOrderCreatedSchema validates structure', () => {
    const payload = {
      type: 'notify.orderCreated',
      notification: {
        id: 'n1',
        userId: 'u1',
        title: 't',
        message: 'm',
        type: 'order',
        read: false,
        timestamp: 1,
      },
    };
    expect(notifyOrderCreatedSchema.parse(payload)).toEqual(payload);
  });

  test('notifyOrderFailedSchema validates structure', () => {
    const payload = {
      type: 'notify.orderFailed',
      notification: {
        id: 'n2',
        userId: 'u2',
        title: 't',
        message: 'm',
        type: 'order',
        read: false,
        timestamp: 1,
      },
    };
    expect(notifyOrderFailedSchema.parse(payload)).toEqual(payload);
  });

  test('backlogErrorSchema validates structure', () => {
    const err = { code: 'E_BACKLOG', retryAfter: 1000 };
    expect(backlogErrorSchema.parse(err)).toEqual(err);
  });
});
