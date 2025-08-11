// @ts-nocheck
import TonWeb from 'tonweb';
import { Buffer } from 'buffer';
import { getTonConnect } from './tonAuth';

const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC');
const tonweb = new TonWeb(provider);

function makeSetPayload(key: string, value: string): TonWeb.boc.Cell {
  const cell = new TonWeb.boc.Cell();
  (cell.bits as any).writeUint(0, 32);
  const body = JSON.stringify({ key, value });
  (cell.bits as any).writeBytes(Buffer.from(body, 'utf8'));
  return cell;
}

export async function setValue(address: string, key: string, value: string) {
  const tonConnect = getTonConnect();
  if (!tonConnect) throw new Error('TonConnect not initialized');
  const cell = makeSetPayload(key, value);
  const payload = TonWeb.utils.bytesToBase64(await cell.toBoc({ idx: false }));
  return await tonConnect.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 60,
    messages: [
      { address, amount: '0', payload },
    ],
  });
}

export async function removeValue(address: string, key: string) {
  return await setValue(address, key, '');
}

export async function getValue(address: string, key: string): Promise<string | null> {
  try {
    const result = await tonweb.provider.call(address, 'get', [
      { type: 'int', value: TonWeb.utils.bytesToHex(Buffer.from(key, 'utf8')) },
    ]);
    const cellBoc = result.stack?.[0]?.[1]?.bytes;
    if (!cellBoc) return null;
    const cell = TonWeb.boc.Cell.fromBoc(Buffer.from(cellBoc, 'base64'))[0];
    const bytes = (cell.bits as any).array.slice(0, cell.bits.cursor);
    return Buffer.from(bytes).toString('utf8');
  } catch (e) {
    return null;
  }
}

export async function listValues(address: string): Promise<{ key: string; value: string }[]> {
  try {
    const result = await tonweb.provider.call(address, 'list', []);
    const dictBoc = result.stack?.[0]?.[1]?.bytes;
    if (!dictBoc) return [];
    const cell = TonWeb.boc.Cell.fromBoc(Buffer.from(dictBoc, 'base64'))[0];
    const dict = cell.beginParse().readDict(256, (c: any) => c.readRemaining());
    const items: { key: string; value: string }[] = [];
    for (const [k, v] of dict.entries()) {
      items.push({ key: k.toString(), value: Buffer.from(v).toString('utf8') });
    }
    return items;
  } catch {
    return [];
  }
}
