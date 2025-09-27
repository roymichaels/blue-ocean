// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { Notification } from '@/types';
import { notImplemented } from '@/services/nearStub';

export async function getNotification(_id: string): Promise<Notification | null> {
  return notImplemented('getNotification');
}

export async function setNotification(_notification: Notification): Promise<void> {
  return notImplemented('setNotification');
}

export async function removeNotification(_id: string): Promise<void> {
  return notImplemented('removeNotification');
}

export async function listNotifications(): Promise<Notification[]> {
  return notImplemented('listNotifications');
}
