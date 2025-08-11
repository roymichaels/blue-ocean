import 'dotenv/config';
import config from '../utils/appConfig';
import { insertConfig } from './testUtils';
import { loadTenantSettings } from '../constants/tenant';



var __DEV__ = false;


beforeEach(async () => {
  for (const key of Object.keys(config)) {
    delete (config as any)[key];
  }
  insertConfig({
    EXPO_PUBLIC_JWT_SECRET: 'test_jwt_secret',
    EXPO_PUBLIC_CHAT_SECRET: 'test_chat_secret',
    EXPO_PUBLIC_WAKU_SECRET: 'test_waku_secret',
  });
  await loadTenantSettings();
});
