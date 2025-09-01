import 'dotenv/config';
import { insertConfig } from './testUtils';

insertConfig({
  NEAR_RPC_URL: 'https://near.test',
  ADMIN_WALLET_ADDRESS_MAINNET: 'EQtestadmin',
  ADMIN_WALLET_ADDRESS_TESTNET: 'EQtestadmin',
  EXPO_PUBLIC_WAKU_BOOTSTRAP: '/dns4/test.waku/tcp/443/wss/p2p/TEST',
  NEAR_SETTINGS_CONTRACT: 'EQtestsettings',
  NEAR_ORDERS_CONTRACT: 'EQtestorders',
  NEAR_PRODUCT_INDEX_CONTRACT: 'EQtestproductindex',
  NEAR_NOTIFICATIONS_CONTRACT: 'EQtestnotifications',
  NEAR_STORES_CONTRACT: 'EQteststores',
  NEAR_REPORTS_CONTRACT: 'EQtestreports',
  NEAR_REVIEWS_CONTRACT: 'EQtestreviews',
  NEAR_CATEGORIES_CONTRACT: 'EQtestcategories',
  NEAR_CART_CONTRACT: 'EQtestcart',
  NEAR_PRODUCTS_CONTRACT: 'EQtestproducts',
  NEAR_USERS_CONTRACT: 'EQtestusers',
  NEAR_PAYMENT_FACTORY_CONTRACT: 'EQtestfactory',
  EXPO_PUBLIC_CHAIN: 'near',
});

jest.mock('../services/nearKvStore', () => require('./tonKvMock'));
jest.mock('../services/nearSettings');
const { loadTenantSettings } = require('../constants/tenant');

var __DEV__ = false;

beforeEach(async () => {
  insertConfig({
    NEAR_RPC_URL: 'https://near.test',
    ADMIN_WALLET_ADDRESS_MAINNET: 'EQtestadmin',
    ADMIN_WALLET_ADDRESS_TESTNET: 'EQtestadmin',
    EXPO_PUBLIC_CHAIN: 'near',
  });
  await loadTenantSettings();
});
