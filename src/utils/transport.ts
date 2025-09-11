import { getTransport } from '@/services/config';

let client: Promise<any> | null = null;

export async function getClient(): Promise<any> {
  if (!client) {
    const transport = getTransport().toLowerCase();
    if (transport === 'waku') {
      client = import('@waku/sdk');
    } else {
      client = import('./httpClient');
    }
  }
  return client;
}

export default { getClient };
