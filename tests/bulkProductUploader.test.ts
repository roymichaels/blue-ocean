import { Product } from '../types';
import { insertConfig } from './testUtils';
import { loadTenantSettings, getAdmins } from '@/constants/tenant';

jest.mock('expo-document-picker', () => ({}));

const uploadMediaMock = jest.fn((uri: string, name: string) => Promise.resolve(`${name}-cid`));

jest.mock('@/services/media', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      uploadMedia: uploadMediaMock,
    }),
  },
}));

const setProductBatchMock = jest.fn(async (_storeId: string, _products: Product[]) => {});
const estimateSetProductBatchMock = jest.fn(async (_products: Product[]) => 1);

jest.mock('@/features/products/services/nearProducts', () => ({
  setProductBatch: (storeId: string, products: Product[]) => setProductBatchMock(storeId, products),
  estimateSetProductBatch: (products: Product[]) => estimateSetProductBatchMock(products),
}));

describe('BulkProductUploader processRecords', () => {
  beforeEach(async () => {
    uploadMediaMock.mockClear();
    setProductBatchMock.mockClear();
    estimateSetProductBatchMock.mockClear();
    insertConfig({
      NEAR_RPC_URL: 'http://localhost',
      ADMIN_WALLET_ADDRESS: undefined,
    });
    await loadTenantSettings();
  });

  it('uploads 100 products in ≤4 batches', async () => {
    const admins = await getAdmins();
    expect(admins).toEqual([]);
    const { processRecords } = await import('@/features/products');
    const products: Product[] = Array.from({ length: 100 }, (_, i) => ({
      id: `p${i}`,
      name: `prod${i}`,
      price: 1,
      description: 'desc',
      category: 'cat',
      images: [],
      rating: 0,
      reviews: 0,
      storeId: 's1',
      stock: 1,
    }));
    const result = await processRecords(products);
    expect(result.success).toBe(100);
    expect(result.failed).toBe(0);
    expect(setProductBatchMock.mock.calls.length).toBeLessThanOrEqual(4);
    expect(estimateSetProductBatchMock.mock.calls.length).toBeLessThanOrEqual(4);
    expect(result.gas.length).toBeLessThanOrEqual(4);
  });
});
