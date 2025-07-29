import { resetConfig } from './testUtils';
import { loadTenantSettings } from '../constants/tenant';

// React Native libraries expect __DEV__ global to exist
// Define it here for the node test environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__DEV__ = true;

beforeEach(async () => {
  await resetConfig({
    EXPO_PUBLIC_JWT_SECRET: 'test_jwt_secret',
    EXPO_PUBLIC_CHAT_SECRET: 'test_chat_secret',
    EXPO_PUBLIC_WAKU_SECRET: 'test_waku_secret',
  });
  await loadTenantSettings();
});
