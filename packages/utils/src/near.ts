// STUB: NEAR removed. Do not implement here. Bolt will replace with Supabase.
const STUB_MESSAGE = 'NEAR removed; pending Supabase refactor';

export class NotImplementedError extends Error {
  constructor(message = STUB_MESSAGE) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

const throwNotImplemented = (name: string): never => {
  throw new NotImplementedError('NotImplemented: ' + name + ' (' + STUB_MESSAGE + ')');
};

export async function makeNear(_networkId = 'testnet'): Promise<never> {
  return throwNotImplemented('makeNear');
}

export interface CallOptions {
  gas?: bigint;
  deposit?: bigint;
}

export async function callFunction(
  _account: unknown,
  _contractId: string,
  _methodName: string,
  _args: object = {},
  _options: CallOptions = {},
): Promise<never> {
  return throwNotImplemented('callFunction');
}

export async function viewFunction(
  _near: unknown,
  _contractId: string,
  _methodName: string,
  _args: object = {},
): Promise<never> {
  return throwNotImplemented('viewFunction');
}

export default {
  makeNear,
  callFunction,
  viewFunction,
};
