import { encryptWakuPayload, decryptWakuPayload } from '../lib/waku/wakuCrypto';
import { sha256 } from '@noble/hashes/sha256';

let ed: any;
beforeAll(async () => {
  ed = await import('@noble/ed25519');
});

test('signature verifies after encryption round trip', async () => {
  const priv = ed.utils.randomPrivateKey();
  const pub = await ed.getPublicKeyAsync(priv);
  const sender = { id: '1', publicKey: ed.etc.bytesToHex(pub), role: 'admin' };

  const payloadObj = { type: 'user.update', user: { name: 'A' }, sender };
  const payloadStr = JSON.stringify(payloadObj);
  const hash = sha256(new TextEncoder().encode(payloadStr));
  const sig = await ed.signAsync(hash, priv);
  const signature = ed.etc.bytesToHex(sig);
  const messageStr = JSON.stringify({ ...payloadObj, signature });

  const enc = await encryptWakuPayload(messageStr);
  const dec = await decryptWakuPayload(enc);
  expect(dec).toBe(messageStr);

  const parsed = JSON.parse(dec);
  const verifyObj = { type: parsed.type, user: parsed.user, sender: parsed.sender };
  const verifyHash = sha256(new TextEncoder().encode(JSON.stringify(verifyObj)));
  const ok = await ed.verifyAsync(ed.etc.hexToBytes(parsed.signature), verifyHash, pub);
  expect(ok).toBe(true);
});
