import { errorLog } from '@/utils/logger';
import TonWeb from 'tonweb';

const DEFAULT_RPC = 'https://toncenter.com/api/v2/jsonRPC';
const FALLBACK_RPC = process.env.TON_RPC_FALLBACK_URLS?.split(',').filter(Boolean) ?? [];
const RPC_ENDPOINTS = [process.env.TON_RPC_URL || DEFAULT_RPC, ...FALLBACK_RPC];

export function getTonWeb(url: string = RPC_ENDPOINTS[0]): TonWeb {
  const provider = new TonWeb.HttpProvider(url);
  return new TonWeb(provider);
}

export async function withTonWeb<T>(callback: (tonweb: TonWeb) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const url of RPC_ENDPOINTS) {
    try {
      const tonweb = getTonWeb(url);
      return await callback(tonweb);
    } catch (error) {
      lastError = error;
      errorLog(`Ton RPC call failed for ${url}`, error);
    }
  }
  throw lastError;
}
