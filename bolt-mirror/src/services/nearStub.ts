export const STUB_MESSAGE = 'NEAR removed; pending Supabase refactor';

export function notImplemented(name: string): never {
  throw new Error('NotImplemented: ' + name + ' (' + STUB_MESSAGE + ')');
}
