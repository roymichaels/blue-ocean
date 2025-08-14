import 'dotenv/config';
import { insertConfig } from './testUtils';
jest.mock('../services/tonKvStore', () => require('./tonKvMock'));
jest.mock('../services/tonSettings');
const { loadTenantSettings } = require('../constants/tenant');

var __DEV__ = false;

beforeEach(async () => {
  insertConfig({ TON_RPC_URL: 'https://ton.test' });
  await loadTenantSettings();
});
