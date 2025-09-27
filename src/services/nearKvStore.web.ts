// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
import { notImplemented } from '@/services/nearStub';

export async function setValue(_address: string, _key: string, _value: string): Promise<void> {
  return notImplemented('setValue');
}

export async function removeValue(_address: string, _key: string): Promise<void> {
  return notImplemented('removeValue');
}

export async function getValue(_address: string, _key: string): Promise<string | null> {
  return notImplemented('getValue');
}

export async function listValues(
  _address: string,
): Promise<Array<{ key: string; value: string }>> {
  return notImplemented('listValues');
}
