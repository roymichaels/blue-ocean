import 'dotenv/config';
import { insertConfig } from './testUtils';

insertConfig({
  NEAR_RPC_URL: 'https://near.test',
  ADMIN_WALLET_ADDRESS_MAINNET: 'EQtestadmin',
  ADMIN_WALLET_ADDRESS_TESTNET: 'EQtestadmin',
  EXPO_PUBLIC_WAKU_BOOTSTRAP: '/dns4/test.waku/tcp/443/wss/p2p/TEST',
  EXPO_PUBLIC_CHAIN: 'near',
  EXPO_PUBLIC_CONTRACT_ID: 'EQtestcontract',
});

jest.mock('@/services/nearKvStore', () => require('./nearKvMock'));
jest.mock('@/services/nearSettings');
const { loadTenantSettings } = require('@/constants/tenant');

var __DEV__ = false;

beforeEach(async () => {
  insertConfig({
    NEAR_RPC_URL: 'https://near.test',
    ADMIN_WALLET_ADDRESS_MAINNET: 'EQtestadmin',
    ADMIN_WALLET_ADDRESS_TESTNET: 'EQtestadmin',
    EXPO_PUBLIC_CHAIN: 'near',
    EXPO_PUBLIC_CONTRACT_ID: 'EQtestcontract',
  });
  await loadTenantSettings();
});
