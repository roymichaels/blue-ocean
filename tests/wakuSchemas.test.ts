import { z } from 'zod';
import {
  parseWakuMessage,
  settingsWriteEventSchema,
  parseNotificationWakuPayload,
} from '../schemas/waku';

describe('Waku schemas', () => {
  test('parseWakuMessage accepts valid message', () => {
    const msg = {
      type: 'test',
      payload: 'hello',
      sender: { publicKey: '0xabc' },
      signature: '0xdef',
      ts: Date.now(),
      nonce: 'nonce-schema',
    };
    const parsed = parseWakuMessage(msg, z.string());
    expect(parsed).toEqual(msg);
  });

  test('parseWakuMessage rejects invalid message', () => {
    const msg = { type: 'test', payload: 'hi', sender: {}, signature: '0x' };
    const parsed = parseWakuMessage(msg, z.string());
    expect(parsed).toBeNull();
  });

  test('parseNotificationWakuPayload validates structure', () => {
    const payload = {
      type: 'order.created',
      notification: {
        id: '1',
        userId: 'u',
        title: 't',
        message: 'm',
        type: 'order',
        read: false,
        timestamp: 1,
      },
      ts: Date.now(),
      nonce: 'notification-nonce',
    };
    expect(parseNotificationWakuPayload(payload)).toEqual(payload);
  });

  test('parseNotificationWakuPayload rejects bad data', () => {
    const payload = { type: 'order.created', notification: { id: '1' } };
    expect(parseNotificationWakuPayload(payload)).toBeNull();
  });

  test('settingsWriteEventSchema validates payload', () => {
    const evt = {
      type: 'settings.write',
      key: 'k',
      value: 'v',
      actor: 'a',
      timestamp: 1,
    };
    expect(settingsWriteEventSchema.parse(evt)).toEqual(evt);
  });
});
