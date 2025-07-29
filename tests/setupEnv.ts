import { resetConfig } from './testUtils';
import { loadTenantSettings } from '../constants/tenant';

beforeEach(async () => {
  await resetConfig({
    EXPO_PUBLIC_JWT_SECRET: 'test_jwt_secret',
    EXPO_PUBLIC_CHAT_SECRET: 'test_chat_secret',
    EXPO_PUBLIC_WAKU_SECRET: 'test_waku_secret',
  });
  await loadTenantSettings();
});
