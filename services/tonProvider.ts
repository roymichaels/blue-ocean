import { errorLog } from '@/utils/logger';
import TonWeb from 'tonweb';
import { getTonRpcUrls } from '@/utils/appConfig';

const RPC_ENDPOINTS = getTonRpcUrls();

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
