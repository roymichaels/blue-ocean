import 'dotenv/config';
import { insertConfig } from './testUtils';
import { loadTenantSettings } from '../constants/tenant';

var __DEV__ = false;

beforeEach(async () => {
  insertConfig({});
  await loadTenantSettings();
});
