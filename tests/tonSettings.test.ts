import { fetchSettings } from '../services/tonSettings';

jest.mock('../services/tonKvStore', () => require('./tonKvMock'));

const { setValue, __clear } = require('./tonKvMock');

describe('fetchSettings feePercent parsing', () => {
  beforeEach(() => {
    __clear();
  });

  it('defaults feePercent to 0 for non-numeric values', async () => {
    await setValue('', 'feePercent', 'not-a-number');
    await expect(fetchSettings()).resolves.toMatchObject({ feePercent: 0 });
  });

  it('handles float feePercent values', async () => {
    await setValue('', 'feePercent', '1.5');
    await expect(fetchSettings()).resolves.toMatchObject({ feePercent: 1.5 });
  });
});
