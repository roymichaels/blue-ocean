// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import type { Report } from '@/types';
import { notImplemented } from '@/services/nearStub';

export async function addReport(_report: Report): Promise<void> {
  return notImplemented('addReport');
}

export async function listReports(): Promise<Report[]> {
  return notImplemented('listReports');
}

export async function removeReport(_id: string): Promise<void> {
  return notImplemented('removeReport');
}
