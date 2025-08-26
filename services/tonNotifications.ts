import { getValue, setValue, listValues, removeValue } from './tonKvStore';
import { Notification } from '../types';
import { requireEnv } from '../utils/appConfig';

const ADDRESS = requireEnv('TON_NOTIFICATIONS_ADDRESS');

export async function getNotification(id: string): Promise<Notification | null> {
  const res = await getValue(ADDRESS, id);
  return res ? (JSON.parse(res) as Notification) : null;
}

export async function setNotification(notification: Notification) {
  await setValue(ADDRESS, notification.id, JSON.stringify(notification));
}

export async function removeNotification(id: string) {
  await removeValue(ADDRESS, id);
}

export async function listNotifications(): Promise<Notification[]> {
  const items = await listValues(ADDRESS);
  return items.map((i) => JSON.parse(i.value) as Notification);
}
