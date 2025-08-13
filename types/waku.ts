import type { Notification } from './index';

export interface WakuMessage<T = any> {
  type: string;
  payload: T;
  sender: {
    publicKey: string;
    role?: string;
  };
  signature: string;
}

export interface SettingsWriteEvent {
  type: 'settings.write';
  key: string;
  value: string;
  actor: string;
  timestamp: number;
}

export type NotificationEvent =
  | 'order.created'
  | 'payment.received'
  | 'status.updated'
  | 'dispute.updated'
  | 'escrow.deployed';

export interface NotificationWakuPayload {
  type: NotificationEvent;
  notification: Notification;
}
