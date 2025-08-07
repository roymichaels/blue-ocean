import { encryptWakuPayload, decryptWakuPayload } from '../lib/waku/wakuCrypto';

test('payload round-trips through encryption', async () => {
  const payloadObj = { type: 'user.update', user: { name: 'A' } };
  const payloadStr = JSON.stringify(payloadObj);
  const enc = await encryptWakuPayload(payloadStr);
  const dec = await decryptWakuPayload(enc);
  expect(dec).toBe(payloadStr);
});
