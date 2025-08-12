import 'dotenv/config';
import { insertConfig } from './testUtils';
jest.mock('../services/tonKvStore', () => require('./tonKvMock'));
import { loadTenantSettings } from '../constants/tenant';

var __DEV__ = false;

beforeEach(async () => {
  insertConfig({});
  await loadTenantSettings();
});
