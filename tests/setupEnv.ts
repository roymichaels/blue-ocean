import 'dotenv/config';
import { jest } from '@jest/globals';
import { insertConfig } from './testUtils';

insertConfig({
  NEAR_RPC_URL: 'https://near.test',
  ADMIN_WALLET_ADDRESS_MAINNET: 'EQtestadmin',
  ADMIN_WALLET_ADDRESS_TESTNET: 'EQtestadmin',
  EXPO_PUBLIC_WAKU_BOOTSTRAP: '/dns4/test.waku/tcp/443/wss/p2p/TEST',
  EXPO_PUBLIC_CHAIN: 'near',
  EXPO_PUBLIC_CONTRACT_ID: 'EQtestcontract',
  EXPO_PUBLIC_NETWORK: 'testnet',
});

jest.mock('@/services/nearKvStore', () => require('./nearKvMock'));
jest.mock('@/services/nearSettings');
jest.mock('expo-secure-store');

var __DEV__ = false;

beforeEach(async () => {
  insertConfig({
    NEAR_RPC_URL: 'https://near.test',
    ADMIN_WALLET_ADDRESS_MAINNET: 'EQtestadmin',
    ADMIN_WALLET_ADDRESS_TESTNET: 'EQtestadmin',
    EXPO_PUBLIC_CHAIN: 'near',
    EXPO_PUBLIC_CONTRACT_ID: 'EQtestcontract',
    EXPO_PUBLIC_NETWORK: 'testnet',
  });
  const { loadTenantSettings } = await import('@/constants/tenant');
  await loadTenantSettings();
});
