import { errorLog } from '@/utils/logger';
import TonWeb from 'tonweb';
import { getTonRpcUrls } from '@/utils/appConfig';

export function getTonWeb(url?: string): TonWeb {
  const endpoints = getTonRpcUrls();
  const provider = new TonWeb.HttpProvider(url || endpoints[0]);
  return new TonWeb(provider);
}

export async function withTonWeb<T>(callback: (tonweb: TonWeb) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const url of getTonRpcUrls()) {
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
