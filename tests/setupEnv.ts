import 'dotenv/config';
import { insertConfig } from './testUtils';
import { loadTenantSettings } from '../constants/tenant';

var __DEV__ = false;

beforeEach(async () => {
  insertConfig({
    EXPO_PUBLIC_JWT_SECRET: 'test_jwt_secret',
    EXPO_PUBLIC_ADMIN_PUBLIC_KEY: 'admin_test_key',
    TON_SETTINGS_ADDRESS:
      process.env.TON_SETTINGS_ADDRESS ||
      'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
    TON_USERS_ADDRESS:
      process.env.TON_USERS_ADDRESS ||
      'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
  });
  await loadTenantSettings();
});
