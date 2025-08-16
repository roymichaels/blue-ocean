import { beginCell, Cell, Dictionary } from '@ton/core';
import { ProductIndexItem } from '../types';
import config from '../utils/appConfig';
import { getTonConnect } from './tonAuth';

const ADDRESS =
  config.TON_PRODUCT_INDEX_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

export function encodeProductIndexItem(item: ProductIndexItem): Cell {
  return beginCell()
    .storeUint(item.price, 64)
    .storeStringRefTail(item.storeId)
    .storeStringRefTail(item.metadataUri)
    .storeStringRefTail(item.image)
    .endCell();
}

export function decodeProductIndexItem(
  id: string,
  cell: Cell
): ProductIndexItem {
  const s = cell.beginParse();
  const price = Number(s.loadUint(64));
  const storeId = s.loadStringRefTail();
  const metadataUri = s.loadStringRefTail();
  const image = s.loadStringRefTail();
  return { id, storeId, price, metadataUri, image };
}

function buildBatch(items: ProductIndexItem[]): Cell {
  const dict = Dictionary.empty(
    Dictionary.Keys.Uint(32),
    Dictionary.Values.Cell()
  );
  for (const item of items) {
    dict.set(BigInt(item.id), encodeProductIndexItem(item));
  }
  return beginCell().storeDict(dict).endCell();
}

export async function setProductBatch(
  items: ProductIndexItem[]
): Promise<void> {
  const tonConnect = getTonConnect();
  if (!tonConnect) {
    throw new Error('TonConnect not initialized');
  }
  const body = beginCell()
    .storeUint(0, 32) // opcode placeholder for "set_batch"
    .storeRef(buildBatch(items))
    .endCell();
  const payload = body.toBoc().toString('base64');
  await tonConnect.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 60,
    messages: [{ address: ADDRESS, amount: '0', payload }],
  });
}

export function estimateSetProductBatch(items: ProductIndexItem[]): number {
  return buildBatch(items).toBoc().length;
}

