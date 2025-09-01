import 'dotenv/config';
import { insertConfig } from './testUtils';

insertConfig({
  TON_RPC_URL: 'https://ton.test',
  ADMIN_WALLET_ADDRESS_MAINNET: 'EQtestadmin',
  ADMIN_WALLET_ADDRESS_TESTNET: 'EQtestadmin',
  EXPO_PUBLIC_WAKU_BOOTSTRAP: '/dns4/test.waku/tcp/443/wss/p2p/TEST',
  TON_SETTINGS_ADDRESS: 'EQtestsettings',
  TON_ORDERS_ADDRESS: 'EQtestorders',
  TON_PRODUCT_INDEX_ADDRESS: 'EQtestproductindex',
  TON_NOTIFICATIONS_ADDRESS: 'EQtestnotifications',
  TON_STORES_ADDRESS: 'EQteststores',
  TON_REPORTS_ADDRESS: 'EQtestreports',
  TON_REVIEWS_ADDRESS: 'EQtestreviews',
  TON_CATEGORIES_ADDRESS: 'EQtestcategories',
  TON_CART_ADDRESS: 'EQtestcart',
  TON_PRODUCTS_ADDRESS: 'EQtestproducts',
  TON_USERS_ADDRESS: 'EQtestusers',
  TON_PAYMENT_FACTORY_ADDRESS: 'EQtestfactory',
  EXPO_PUBLIC_CHAIN: 'ton',
});

jest.mock('../services/nearKvStore', () => require('./tonKvMock'));
jest.mock('../services/tonSettings');
const { loadTenantSettings } = require('../constants/tenant');

var __DEV__ = false;

beforeEach(async () => {
  insertConfig({
    TON_RPC_URL: 'https://ton.test',
    ADMIN_WALLET_ADDRESS_MAINNET: 'EQtestadmin',
    ADMIN_WALLET_ADDRESS_TESTNET: 'EQtestadmin',
    EXPO_PUBLIC_CHAIN: 'ton',
  });
  await loadTenantSettings();
});
