import 'dotenv/config';
import { insertConfig } from './testUtils';

insertConfig({
  TON_RPC_URL: 'https://ton.test',
  ADMIN_WALLET_ADDRESS_MAINNET: 'EQtestadmin',
  ADMIN_WALLET_ADDRESS_TESTNET: 'EQtestadmin',
});

jest.mock('../services/tonKvStore', () => require('./tonKvMock'));
jest.mock('../services/tonSettings');
const { loadTenantSettings } = require('../constants/tenant');

var __DEV__ = false;

beforeEach(async () => {
  insertConfig({
    TON_RPC_URL: 'https://ton.test',
    ADMIN_WALLET_ADDRESS_MAINNET: 'EQtestadmin',
    ADMIN_WALLET_ADDRESS_TESTNET: 'EQtestadmin',
  });
  await loadTenantSettings();
});
