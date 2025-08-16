import { beginCell, Dictionary } from '@ton/core';
import {
  encodeProductIndexItem,
  decodeProductIndexItem,
  estimateSetProductBatch,
} from '../services/tonProductIndex';
import { ProductIndexItem } from '../types';

describe('tonProductIndex encoding', () => {
  it('encodes and decodes symmetrically', () => {
    const item: ProductIndexItem = {
      id: '1',
      storeId: 'store',
      price: 100,
      metadataUri: 'ipfs://meta',
      image: 'ipfs://img',
    };
    const cell = encodeProductIndexItem(item);
    const decoded = decodeProductIndexItem(item.id, cell);
    expect(decoded).toEqual(item);
  });

  it('estimates batch size correctly', () => {
    const items: ProductIndexItem[] = [
      {
        id: '1',
        storeId: 'a',
        price: 1,
        metadataUri: 'u1',
        image: 'i1',
      },
      {
        id: '2',
        storeId: 'b',
        price: 2,
        metadataUri: 'u2',
        image: 'i2',
      },
    ];

    const estimate = estimateSetProductBatch(items);

    const dict = Dictionary.empty(
      Dictionary.Keys.Uint(32),
      Dictionary.Values.Cell()
    );
    for (const item of items) {
      dict.set(BigInt(item.id), encodeProductIndexItem(item));
    }
    const actual = beginCell().storeDict(dict).endCell().toBoc().length;

    expect(estimate).toBe(actual);
  });
});

