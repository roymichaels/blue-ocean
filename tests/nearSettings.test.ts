import { fetchSettings } from '../services/nearSettings';

jest.mock('../services/nearKvStore', () => require('./nearKvMock'));

const { setValue, __clear } = require('./nearKvMock');

describe('fetchSettings feeBps parsing', () => {
  beforeEach(() => {
    __clear();
  });

  it('defaults feeBps to 0 for non-numeric values', async () => {
    await setValue('', 'feeBps', 'not-a-number');
    await expect(fetchSettings()).resolves.toMatchObject({ feeBps: 0 });
  });

  it('handles numeric feeBps values', async () => {
    await setValue('', 'feeBps', '150');
    await expect(fetchSettings()).resolves.toMatchObject({ feeBps: 150 });
  });
});
