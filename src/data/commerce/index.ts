export * from './types';
export { createMockCommerceClient } from './mockClient';
export { createNetworkCommerceClient } from './networkClient';

import type { AppMode } from '@/application/types';
import { createMockCommerceClient } from './mockClient';
import { createNetworkCommerceClient } from './networkClient';
import type { CommerceClient } from './types';

export function createCommerceClient(mode: AppMode, baseUrl?: string): CommerceClient {
  if (mode === 'mock') {
    return createMockCommerceClient({ mode });
  }
  return createNetworkCommerceClient({ mode, baseUrl });
}
