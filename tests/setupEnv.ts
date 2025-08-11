import 'dotenv/config';
import { insertConfig } from './testUtils';
import { loadTenantSettings } from '../constants/tenant';

var __DEV__ = false;

beforeEach(async () => {
  insertConfig({
    EXPO_PUBLIC_JWT_SECRET: 'test_jwt_secret',
    EXPO_PUBLIC_CHAT_SECRET: 'test_chat_secret',
  });
  await loadTenantSettings();
});
