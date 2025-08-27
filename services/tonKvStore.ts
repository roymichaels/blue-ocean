import { errorLog } from '@/utils/logger';
import TonWeb from 'tonweb';
import type { Cell } from 'tonweb/dist/types/boc/cell';
import { Buffer } from 'buffer';
import nearAuth from './nearAuth';
import { withTonWeb } from './tonProvider';

interface Slice {
  readDict<T>(keySize: number, parser: (cell: Slice) => T): Map<bigint, T>;
  readRemaining(): Uint8Array;
}

type CellWithParse = Cell & { beginParse: () => Slice };

function makeSetPayload(key: string, value: string): Cell {
  const cell = new TonWeb.boc.Cell();
  cell.bits.writeUint(0, 32);
  const body = JSON.stringify({ key, value });
  cell.bits.writeBytes(Buffer.from(body, 'utf8'));
  return cell;
}

export async function setValue(address: string, key: string, value: string) {
  const cell = makeSetPayload(key, value);
  const payload = TonWeb.utils.bytesToBase64(await cell.toBoc(false));
  await nearAuth.signMessage(Buffer.from(payload));
}

export async function removeValue(address: string, key: string) {
  return await setValue(address, key, '');
}

export async function getValue(address: string, key: string): Promise<string | null> {
  try {
    return await withTonWeb(async tw => {
      const result = await tw.provider.call(address, 'get', [
        { type: 'int', value: TonWeb.utils.bytesToHex(Buffer.from(key, 'utf8')) } as any,
      ]);
      const cellBoc = result.stack?.[0]?.[1]?.bytes;
      if (!cellBoc) return null;
      const cell = TonWeb.boc.Cell.fromBoc(Buffer.from(cellBoc, 'base64'))[0];
      const bytes = cell.bits.array.slice(0, cell.bits.cursor);
      return Buffer.from(bytes).toString('utf8');
    });
  } catch (e) {
    errorLog('Failed to get value', e);
    return null;
  }
}

export async function listValues(address: string): Promise<{ key: string; value: string }[]> {
  try {
    return await withTonWeb(async tw => {
      const result = await tw.provider.call(address, 'list', []);
      const dictBoc = result.stack?.[0]?.[1]?.bytes;
      if (!dictBoc) return [];
      const cell = TonWeb.boc.Cell.fromBoc(Buffer.from(dictBoc, 'base64'))[0];
      const slice = (cell as CellWithParse).beginParse();
      const dict = slice.readDict<Uint8Array>(256, (c: Slice) => c.readRemaining());
      const items: { key: string; value: string }[] = [];
      for (const [k, v] of dict.entries()) {
        items.push({ key: k.toString(), value: Buffer.from(v).toString('utf8') });
      }
      return items;
    });
  } catch (e) {
    errorLog('Failed to list values', e);
    return [];
  }
}
